import { NextRequest, NextResponse } from 'next/server';
import { list, put, del } from '@vercel/blob';

// Ensure this route runs on the Edge runtime so Request.formData() works reliably
export const runtime = 'edge';
// Avoid caching for dynamic data
export const dynamic = 'force-dynamic';

// 갤러리 아이템 타입
export interface GalleryItem {
  id: string;
  title: string;
  content: string;
  author: string;
  imageUrl?: string;
  iconUrl?: string;
  screenshotUrls?: string[];
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

    // Vercel Blob에서 해당 타입의 폴더 조회 (gallery/normal은 동일 폴더 사용)
    const folderPaths = new Set<string>();
    if (type === 'gallery' || type === 'normal') {
      folderPaths.add('gallery-gallery');
    } else if (type === 'featured') {
      folderPaths.add('gallery-featured');
    } else if (type === 'events') {
      folderPaths.add('gallery-events');
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
  } catch {
      }
    }

    // 타입별 필터링
    let filteredItems: GalleryItem[];
    if (type === 'gallery') {
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

  } catch {
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
      const title = (formData.get('title') ?? '') as string;
      const content = (formData.get('content') ?? '') as string;
      const author = (formData.get('author') ?? '') as string;
      const tags = (formData.get('tags') ?? '') as string;
      const isPublished = (formData.get('isPublished') as string) === 'true';
      const store = (formData.get('store') as 'google-play' | 'app-store' | null) ?? null;
      const storeUrl = (formData.get('storeUrl') as string | null) ?? null;
      const appCategory = (formData.get('appCategory') as string | null) ?? null;
      const fileMaybe = formData.get('file'); // 아이콘 파일 (string | File | null)
      const screenshotsMaybe = formData.getAll('screenshots'); // (Array<string | File>)

      const file = fileMaybe instanceof File && fileMaybe.size > 0 ? fileMaybe : null;
      const screenshots = (Array.isArray(screenshotsMaybe)
        ? screenshotsMaybe.filter((s): s is File => s instanceof File && s.size > 0)
        : []) as File[];

      if (!title || !content || !author) {
        return NextResponse.json({ error: '필수 필드가 누락되었습니다' }, { status: 400 });
      }

      // 고유 ID 생성
      const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  let imageUrl: string | undefined;
  let iconUrl: string | undefined;
  const screenshotUrls: string[] = [];

  // 이미지 업로드 - type에 따라 경로 결정 (gallery/normal 공용 폴더)
  const imageFolder = (type === 'gallery' || type === 'normal') ? 'gallery-gallery' : `gallery-${type}`;

      if (file) {
        const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png';
        const filename = `${id}-icon.${ext}`;
        const blob = await put(`${imageFolder}/${filename}`, file, { access: 'public' });
        iconUrl = blob.url;
        // 하위 호환을 위해 imageUrl도 아이콘으로 설정 (초기 구현과 동일 동작)
        imageUrl = blob.url;
      }

      if (screenshots && Array.isArray(screenshots) && screenshots.length > 0) {
        let idx = 1;
        for (const shot of screenshots) {
          if (!shot) continue;
          const ext = shot.name && shot.name.includes('.') ? shot.name.split('.').pop() : 'jpg';
          const filename = `${id}-screenshot-${idx}.${ext}`;
          const blob = await put(`${imageFolder}/${filename}`, shot, { access: 'public' });
          screenshotUrls.push(blob.url);
          idx += 1;
        }
        // 대표 이미지로 첫 번째 스크린샷을 사용하도록 imageUrl 업데이트 (있을 경우)
        if (screenshotUrls.length > 0) {
          imageUrl = screenshotUrls[0];
        }
      }

      // 갤러리 아이템 생성
      galleryItem = {
        id,
        title,
        content,
        author,
        imageUrl,
        iconUrl,
        screenshotUrls: screenshotUrls.length > 0 ? screenshotUrls : undefined,
        publishDate: new Date().toISOString(),
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        isPublished,
        type,
        store: store || 'google-play', // 기본값으로 구글플레이 설정
        storeUrl: storeUrl || undefined,
        appCategory: (appCategory as 'normal' | 'featured' | 'events') || 'normal', // 기본값으로 normal 설정
      };
    }

  // JSON 파일로 저장 - type에 따라 경로 결정 (gallery/normal 공용 폴더)
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

  } catch {
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

    // Vercel Blob에서 해당 타입의 폴더 조회 (gallery/normal은 동일 폴더 사용)
    const folderPaths = new Set<string>();
    if (type === 'gallery' || type === 'normal') {
      folderPaths.add('gallery-gallery');
    } else if (type === 'featured') {
      folderPaths.add('gallery-featured');
    } else if (type === 'events') {
      folderPaths.add('gallery-events');
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

  // 새 JSON 파일 생성 - type에 따라 경로 결정 (gallery/normal 공용 폴더)
    const jsonFilename = `${item.id}.json`;
  // type이 gallery 또는 normal이면 gallery-gallery 폴더에, 아니면 gallery-{type} 폴더에 저장
  const jsonFolder = (type === 'gallery' || type === 'normal') ? 'gallery-gallery' : `gallery-${type}`;
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

  } catch {
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

    // Vercel Blob에서 해당 타입의 폴더 조회 (gallery/normal은 동일 폴더 사용)
    const folderPaths = new Set<string>();
    if (type === 'gallery' || type === 'normal') {
      folderPaths.add('gallery-gallery');
    } else if (type === 'featured') {
      folderPaths.add('gallery-featured');
    } else if (type === 'events') {
      folderPaths.add('gallery-events');
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

    // 이미지 파일도 삭제 (있는 경우) - 해당 ID에 매칭되는 모든 이미지 삭제
    const imageFiles = allBlobs.filter(blob => 
      blob.pathname.includes(`/${id}-`) && 
      !blob.pathname.endsWith('.json')
    );
    if (imageFiles.length > 0) {
      for (const img of imageFiles) {
        await del(img.url);
      }
    }

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });

  } catch {
    return NextResponse.json({ error: '갤러리 삭제 실패' }, { status: 500 });
  }
}
