import { NextRequest, NextResponse } from 'next/server';
import { list, put, del } from '@vercel/blob';

// 갤러리 아이템 타입
export interface GalleryItem {
  id: string;
  title: string;
  content: string;
  author: string;
  imageUrl?: string;
  publishDate: string;
  tags?: string[];
  isPublished: boolean;
  type: 'gallery' | 'featured' | 'events' | 'normal';
  store?: 'google-play' | 'app-store'; // 스토어 정보 추가
  storeUrl?: string; // 스토어 URL 추가
  appCategory?: 'normal' | 'featured' | 'events'; // 앱 카테고리 추가
  status?: 'published' | 'development' | 'in-review'; // 앱 상태 추가
}

// GET: 갤러리 아이템 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | 'featured' | 'events' | 'normal' | null;

    if (!type) {
      return NextResponse.json({ error: 'Type parameter is required' }, { status: 400 });
    }

    // Vercel Blob에서 해당 타입의 폴더 조회
    const folderPaths = new Set([`gallery-${type}`]);
    if (type === 'featured') {
      folderPaths.add(`gallery-featured`);
    } else if (type === 'events') {
      folderPaths.add(`gallery-events`);
    }
    
    const allBlobs = [];
    for (const folderPath of folderPaths) {
      const { blobs } = await list({
        prefix: `${folderPath}/`,
      });
      allBlobs.push(...blobs);
    }

    // JSON 파일들만 필터링
    const jsonFiles = allBlobs.filter(blob => blob.pathname.endsWith('.json'));
    
    const items: GalleryItem[] = [];

    // 각 JSON 파일에서 데이터 로드
    for (const jsonFile of jsonFiles) {
      try {
        const response = await fetch(jsonFile.url);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            items.push(...data);
          } else if (data.id) {
            items.push(data);
          }
        }
      } catch (error) {
      }
    }

    // 타입별 필터링
    let filteredItems: GalleryItem[];
    if (type === 'gallery' || type === 'normal') {
      // All apps에서는 review와 published 상태의 카드들을 모두 표시
      filteredItems = items.filter(item => 
        (item.isPublished || item.status === 'in-review' || item.status === 'published')
      );
    } else {
      // Featured와 Events는 발행된 아이템만 반환
      filteredItems = items.filter(item => 
        item.isPublished
      );
    }
    
    return NextResponse.json(filteredItems);

  } catch (error) {
    return NextResponse.json({ error: '갤러리 조회 실패' }, { status: 500 });
  }
}

// POST: 갤러리 아이템 생성/업데이트
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | 'featured' | 'events' | 'normal' | null;


    if (!type) {
      return NextResponse.json({ error: 'Type parameter is required' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type');
    let galleryItem: GalleryItem;

    if (contentType?.includes('application/json')) {
      // JSON 데이터 처리 (타입 변경 시 사용)
      const body = await request.json();
      const { item } = body;
      
      if (!item || !item.id) {
        return NextResponse.json({ error: 'Item data and ID are required' }, { status: 400 });
      }

      galleryItem = {
        ...item,
        type, // URL 파라미터의 타입으로 강제 설정
      };
    } else {
      // FormData 처리 (기존 업로드 방식)
      const formData = await request.formData();
      const title = formData.get('title') as string;
      const content = formData.get('content') as string;
      const author = formData.get('author') as string;
      const tags = formData.get('tags') as string;
      const isPublished = formData.get('isPublished') === 'true';
      const store = formData.get('store') as 'google-play' | 'app-store' | null;
      const storeUrl = formData.get('storeUrl') as string | null;
      const appCategory = formData.get('appCategory') as string | null;
      const file = formData.get('file') as File | null;

      if (!title || !content || !author) {
        return NextResponse.json({ error: '필수 필드가 누락되었습니다' }, { status: 400 });
      }

      // 고유 ID 생성
      const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      let imageUrl: string | undefined;

      // 이미지 업로드 - type에 따라 경로 결정
      if (file) {
        const filename = `${id}.${file.name.split('.').pop()}`;
        // type이 gallery 또는 normal이면 gallery-gallery 폴더에, 아니면 gallery-{type} 폴더에 저장
        const imageFolder = (type === 'gallery' || type === 'normal') ? 'gallery-gallery' : `gallery-${type}`;
        const blob = await put(`${imageFolder}/${filename}`, file, {
          access: 'public',
        });
        imageUrl = blob.url;
      }

      // 갤러리 아이템 생성
      galleryItem = {
        id,
        title,
        content,
        author,
        imageUrl,
        publishDate: new Date().toISOString(),
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        isPublished,
        type,
        store: store || 'google-play', // 기본값으로 구글플레이 설정
        storeUrl: storeUrl || undefined,
        appCategory: (appCategory as 'normal' | 'featured' | 'events') || 'normal', // 기본값으로 normal 설정
      };
    }

    // JSON 파일로 저장 - type에 따라 경로 결정
    const jsonFilename = `${galleryItem.id}.json`;
    // type이 gallery 또는 normal이면 gallery-gallery 폴더에, 아니면 gallery-{type} 폴더에 저장
    const jsonFolder = (type === 'gallery' || type === 'normal') ? 'gallery-gallery' : `gallery-${type}`;
    const jsonBlob = await put(`${jsonFolder}/${jsonFilename}`, JSON.stringify(galleryItem, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return NextResponse.json({ 
      success: true, 
      item: galleryItem,
      jsonUrl: jsonBlob.url 
    });

  } catch (error) {
    return NextResponse.json({ error: '갤러리 생성 실패' }, { status: 500 });
  }
}

// PUT: 갤러리 아이템 편집
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | 'featured' | 'events' | 'normal' | null;

    if (!type) {
      return NextResponse.json({ error: 'Type parameter is required' }, { status: 400 });
    }

    const body = await request.json();
    const { item } = body;

    if (!item || !item.id) {
      return NextResponse.json({ error: 'Item data and ID are required' }, { status: 400 });
    }

    // Vercel Blob에서 해당 타입의 폴더 조회
    // type별로 해당하는 폴더만 조회 (appCategory별 분리)
    const folderPaths = new Set([`gallery-${type}`]);
    if (type === 'featured') {
      folderPaths.add(`gallery-featured`);
    } else if (type === 'events') {
      folderPaths.add(`gallery-events`);
    }
    
    const allBlobs = [];
    for (const folderPath of folderPaths) {
      const { blobs } = await list({
        prefix: `${folderPath}/`,
      });
      allBlobs.push(...blobs);
    }

    // 해당 ID의 JSON 파일 찾기 (정확한 파일만)
    const existingFile = allBlobs.find(blob => 
      blob.pathname.endsWith('.json') && 
      blob.pathname.includes(`/${item.id}.json`)
    );

    if (!existingFile) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // 기존 JSON 파일 삭제
    await del(existingFile.url);

    // 새 JSON 파일 생성 - type에 따라 경로 결정
    const jsonFilename = `${item.id}.json`;
    // type이 gallery면 gallery-gallery 폴더에, 아니면 gallery-{type} 폴더에 저장
    const jsonFolder = type === 'gallery' ? 'gallery-gallery' : `gallery-${type}`;
    const jsonBlob = await put(`${jsonFolder}/${jsonFilename}`, JSON.stringify(item, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

    return NextResponse.json({ 
      success: true, 
      item: item,
      jsonUrl: jsonBlob.url,
      message: 'Item updated successfully'
    });

  } catch (error) {
    return NextResponse.json({ error: '갤러리 편집 실패' }, { status: 500 });
  }
}

// DELETE: 갤러리 아이템 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'gallery' | 'featured' | 'events' | 'normal' | null;
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID parameters are required' }, { status: 400 });
    }

    // Vercel Blob에서 해당 타입의 폴더 조회
    // type별로 해당하는 폴더만 조회 (appCategory별 분리)
    const folderPaths = new Set([`gallery-${type}`]);
    if (type === 'featured') {
      folderPaths.add(`gallery-featured`);
    } else if (type === 'events') {
      folderPaths.add(`gallery-events`);
    }
    
    const allBlobs = [];
    for (const folderPath of folderPaths) {
      const { blobs } = await list({
        prefix: `${folderPath}/`,
      });
      allBlobs.push(...blobs);
    }

    // 해당 ID의 JSON 파일 찾기 (정확한 파일만)
    const jsonFile = allBlobs.find(blob => 
      blob.pathname.endsWith('.json') && 
      blob.pathname.includes(`/${id}.json`)
    );

    if (!jsonFile) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // JSON 파일 삭제
    await del(jsonFile.url);

    // 이미지 파일도 삭제 (있는 경우) - 같은 폴더에서만
    const imageFile = allBlobs.find(blob => 
      blob.pathname.includes(`/${id}.`) && 
      !blob.pathname.endsWith('.json')
    );

    if (imageFile) {
      await del(imageFile.url);
    }

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });

  } catch (error) {
    return NextResponse.json({ error: '갤러리 삭제 실패' }, { status: 500 });
  }
}

