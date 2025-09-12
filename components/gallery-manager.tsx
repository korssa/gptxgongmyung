"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Eye, ArrowLeft, Upload, Trash2, Edit } from "lucide-react";
import { uploadFile } from "@/lib/storage-adapter";
import { blockTranslationFeedback, createAdminButtonHandler } from "@/lib/translation-utils";
import { AdminUploadDialog } from "./admin-upload-dialog";
import { AdminFeaturedUploadDialog } from "./admin-featured-upload-dialog";
import { AdminEventsUploadDialog } from "./admin-events-upload-dialog";

// 갤러리 아이템 타입 (메모장과 동일한 구조)
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

interface GalleryManagerProps {
  type: 'gallery' | 'featured' | 'events' | 'normal';
  title: string;
  description: string;
  onBack?: () => void;
  isAdmin?: boolean;
}

export function GalleryManager({
  type,
  title,
  description,
  onBack,
  isAdmin = false,
}: GalleryManagerProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [likes, setLikes] = useState<{ [key: string]: number }>({});
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  

  // 갤러리 아이템 로드 (메모장과 동일한 방식)
  const loadItems = async () => {
    try {
      const response = await fetch(`/api/gallery?type=${type}`);
      if (response.ok) {
        const data = await response.json();
        
        // All apps (gallery)에서는 review와 published 상태의 카드들을 모두 표시
        if (type === 'gallery') {
          const filteredData = data.filter((item: GalleryItem) => 
            item.isPublished || item.status === 'in-review' || item.status === 'published'
          );
          setItems(filteredData);
        } else {
          // Featured와 Events는 기존 로직 유지
          const filteredData = data.filter((item: GalleryItem) => item.isPublished);
          setItems(filteredData);
        }
        
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    loadItems();

    // 좋아요 정보 로드
    const savedLikes = localStorage.getItem(`gallery-likes-${type}`);
    if (savedLikes) {
      setLikes(JSON.parse(savedLikes));
    }

    // 번역 피드백 차단
    const blockTranslationFeedback = () => {
      try {
        const selectors = [
          '[class*="goog-"]',
          '[id*="goog-"]',
        ];
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            Object.assign((el as HTMLElement).style, {
              display: 'none',
              visibility: 'hidden',
              opacity: '0',
              pointerEvents: 'none',
              position: 'absolute',
              zIndex: '-9999',
              left: '-9999px',
              top: '-9999px',
            });
          });
        });
      } catch {
        // 에러 무시
      }
    };

    const observer = new MutationObserver(() => blockTranslationFeedback());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    blockTranslationFeedback();

    return () => observer.disconnect();
  }, [type]);

  // 좋아요 핸들러
  const handleLike = (id: string) => {
    setLikes((prev) => {
      const updated = {
        ...prev,
        [id]: (prev[id] || 0) + 1,
      };
      localStorage.setItem(
        `gallery-likes-${type}`,
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  // 편집 핸들러
  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item);
  };

  // 편집 완료 핸들러
  const handleEditComplete = async (updatedItem: GalleryItem, oldType: string, newType: string) => {
    try {
      // 타입이 변경된 경우 특별 처리
      if (oldType !== newType) {
(`🔄 타입 변경 시작: ${oldType} → ${newType}`);
        
        // 1. 기존 타입에서 삭제
(`🗑️ 기존 타입에서 삭제: /api/gallery?type=${oldType}&id=${updatedItem.id}`);
        const deleteResponse = await fetch(`/api/gallery?type=${oldType}&id=${updatedItem.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!deleteResponse.ok) {
          const deleteError = await deleteResponse.text();
          alert(`기존 카드 삭제에 실패했습니다: ${deleteResponse.status}`);
          return;
        }

        // 2. 새 타입으로 생성
        const createResponse = await fetch(`/api/gallery?type=${newType}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ item: updatedItem }),
        });

        if (createResponse.ok) {
          // 로컬 상태에서 기존 아이템 제거
          setItems(prev => prev.filter(item => item.id !== updatedItem.id));                                                                          
          setEditingItem(null);
          alert(`카드가 ${oldType}에서 ${newType}로 이동되었습니다.`);
          // 목록 새로고침
          loadItems();
        } else {
          const createError = await createResponse.text();
          alert(`새 타입으로 이동에 실패했습니다: ${createResponse.status}`);
        }
      } else {
        // 타입이 동일한 경우 기존 편집 로직
        const response = await fetch(`/api/gallery?type=${type}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ item: updatedItem }),
        });

        if (response.ok) {
          // 로컬 상태 업데이트
          setItems(prev => prev.map(item => 
            item.id === updatedItem.id ? updatedItem : item
          ));
          setEditingItem(null);
          alert('편집이 완료되었습니다.');
        } else {
          const editError = await response.text();
          alert(`편집에 실패했습니다: ${response.status}`);
        }
      }
    } catch (error) {
      alert('편집 중 오류가 발생했습니다.');
    }
  };

  // 삭제 핸들러
  const handleDelete = (itemId: string) => {
    createAdminButtonHandler(async () => {
      const item = items.find(item => item.id === itemId);
      if (confirm(`"${item?.title}"을(를) 삭제하시겠습니까?`)) {
        try {
          // API 호출로 삭제
          const response = await fetch(`/api/gallery?type=${type}&id=${itemId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            // 로컬 상태에서 제거
            setItems(prev => prev.filter(item => item.id !== itemId));
          } else {
            alert('삭제에 실패했습니다.');
          }
        } catch (error) {
          alert('삭제 중 오류가 발생했습니다.');
        }
      }
    })();
  };

  // 업로드 성공 핸들러
  const handleUploadSuccess = () => {
    loadItems(); // 목록 새로고침
    setIsUploadDialogOpen(false);
  };

  // 페이지네이션 계산
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 페이지 상단으로 스크롤 (requestAnimationFrame으로 최적화)
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  // 편집 뷰
  if (editingItem) {
    return (
      <div className="space-y-6">
        {/* ← Back 버튼 */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setEditingItem(null)}
            className="bg-[#2e2e2e] text-white hover:bg-[#444] border border-gray-700 hover:border-gray-500 transition"
            onMouseEnter={blockTranslationFeedback}
          >
            <span className="notranslate" translate="no">← Back to Gallery</span>
          </Button>
        </div>

        {/* 편집 폼 */}
        <div className="w-full max-w-2xl mx-auto px-8 sm:px-12 lg:px-16" style={{ maxWidth: '672px' }}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Edit {type} Item</h2>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newType = formData.get('cardType') as 'featured' | 'events';
              const updatedItem: GalleryItem = {
                ...editingItem,
                title: formData.get('title') as string,
                content: formData.get('content') as string,
                author: formData.get('author') as string,
                tags: (formData.get('tags') as string)?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
                store: (formData.get('store') as 'google-play' | 'app-store') || 'google-play',
                storeUrl: formData.get('storeUrl') as string || undefined,
                type: newType,
              };
              handleEditComplete(updatedItem, editingItem.type, newType);
            }} className="space-y-4">
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingItem.title}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Author</label>
                <input
                  type="text"
                  name="author"
                  defaultValue={editingItem.author}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Content</label>
                <textarea
                  name="content"
                  defaultValue={editingItem.content}
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Card Type */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Card Type</label>
                <select
                  name="cardType"
                  defaultValue={editingItem.type}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="featured">Featured Card</option>
                  <option value="events">Events Card</option>
                </select>
              </div>

              {/* Store */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Store</label>
                <select
                  name="store"
                  defaultValue={editingItem.store || 'google-play'}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="google-play">Google Play Store</option>
                  <option value="app-store">App Store</option>
                </select>
              </div>

              {/* Store URL */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Store URL (Optional)</label>
                <input
                  type="url"
                  name="storeUrl"
                  defaultValue={editingItem.storeUrl || ''}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  name="tags"
                  defaultValue={editingItem.tags?.join(', ') || ''}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 세부 뷰
  if (selectedItem) {
    return (
      <div className="space-y-6">
        {/* ← Back 버튼 */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setSelectedItem(null)}
            className="bg-[#2e2e2e] text-white hover:bg-[#444] border border-gray-700 hover:border-gray-500 transition"
            onMouseEnter={blockTranslationFeedback}
          >
            <span className="notranslate" translate="no">← Back to Gallery</span>
          </Button>
        </div>

        {/* 갤러리 아이템 뷰 */}
        <div className="w-full max-w-2xl mx-auto px-8 sm:px-12 lg:px-16" style={{ maxWidth: '672px' }}>
          {/* 헤더 */}
          <div className="border-b border-gray-600 pb-4 mb-6" onMouseEnter={blockTranslationFeedback}>
            <h1 className="text-3xl font-bold text-white mb-2" translate="no">{selectedItem.title}</h1>
            <div className="flex items-center gap-4 text-gray-400 text-sm">
              <span className="flex items-center gap-1"><User className="h-4 w-4" /><span translate="no">{selectedItem.author}</span></span>
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(selectedItem.publishDate).toLocaleDateString()}</span>
              
              {!selectedItem.isPublished && (
                <Badge variant="secondary" className="text-xs">임시저장</Badge>
              )}
            </div>
          </div>

          {/* 이미지 */}
          {selectedItem.imageUrl && (
            <div className="mb-6 flex justify-center">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                className="w-full max-h-[32rem] object-contain rounded-lg border border-gray-600"
              />
            </div>
          )}

          {/* 본문 */}
          <article className="prose prose-invert dark:prose-invert" onMouseEnter={blockTranslationFeedback}>
            <pre
              className="text-gray-300 whitespace-pre-wrap leading-relaxed max-w-none font-mono"
              style={{ wordWrap: "break-word" }}
            >
              {selectedItem.content}
            </pre>
          </article>

          {/* 태그 */}
          {selectedItem.tags && selectedItem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2 mt-6" onMouseEnter={blockTranslationFeedback}>
              {selectedItem.tags.map((tag, idx) => (
                <span key={idx} className="text-xs px-2 py-0 rounded" style={{ backgroundColor: '#fff', color: '#000' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 좋아요 */}
          <div className="flex justify-start mt-6 pt-6 border-t border-gray-600" onMouseEnter={blockTranslationFeedback}>
            <button
              onClick={() => handleLike(selectedItem.id)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">👍</span>
              <span className="text-sm font-medium">{likes[selectedItem.id] || 0}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 기본 목록 뷰
  return (
    <div className="space-y-6">
      {/* 제목 및 설명 */}
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-gray-400" onMouseEnter={blockTranslationFeedback}>{description}</p>
        </div>
        
        {/* 관리자 업로드 버튼 */}
       {isAdmin && type !== 'normal' && (
  <Button
    onClick={() => setIsUploadDialogOpen(true)}
    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-medium rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
    onMouseEnter={blockTranslationFeedback}
  >
    <Upload className="h-4 w-4 mr-2" />
    갤러리 업로드
  </Button>
)}

        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className="bg-[#2e2e2e] text-white hover:bg-[#444] border border-gray-700 hover:border-gray-500 transition"
            onMouseEnter={blockTranslationFeedback}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
        )}
      </div>

      {/* 갤러리 카드 그리드 - 기본 갤러리 카드와 동일한 모양 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {currentItems.length === 0 ? (
          <div className="col-span-full">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center text-gray-400">
                {items.length === 0 ? '아직 업로드된 갤러리 아이템이 없습니다.' : '이 페이지에는 더 이상 아이템이 없습니다.'}
              </CardContent>
            </Card>
          </div>
        ) : (
          currentItems.map((item, index) => (
            <Card
              key={item.id}
              className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{ backgroundColor: '#D1E2EA' }}
              onMouseEnter={blockTranslationFeedback}
            >
              <div className="relative">
                {/* Screenshot/App Preview */}
                <div className="aspect-square overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 relative">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center text-6xl">
                      📱
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-green-500 text-white text-xs">
                    {item.appCategory || item.type}
                  </Badge>
                </div>

                {/* Event Number Badge - Events 타입일 때만 표시 */}
                {type === 'events' && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-purple-600 text-white text-lg font-bold w-8 h-8 flex items-center justify-center">
                      {startIndex + index + 1}
                    </Badge>
                  </div>
                )}

                {/* Admin Buttons - Edit and Delete */}
                {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    {/* Edit Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
                      onClick={() => handleEdit(item)}
                      onMouseEnter={blockTranslationFeedback}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    {/* Delete Button */}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      onClick={() => handleDelete(item.id)}
                      onMouseEnter={blockTranslationFeedback}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <CardContent className="px-2 py-0" style={{ backgroundColor: '#D1E2EA' }}>
                {/* App Icon and Basic Info */}
                <div className="flex items-start space-x-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">📱</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 truncate notranslate" translate="no">{item.title}</h3>
                    <p className="text-sm text-muted-foreground truncate notranslate" translate="no">{item.author}</p>
                  </div>
                </div>

                {/* Rating and Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{new Date(item.publishDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-0">
                    {item.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {item.tags.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{item.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>

              {/* Store Links Section */}
              <div className="w-full bg-[#84CC9A] border-t border-gray-300 px-4 py-2">
                <div className="flex flex-col items-center space-y-2">
                  <Button
                    size="sm"
                    className="h-6 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 whitespace-nowrap"
                    onClick={() => {
                      if (item.storeUrl) {
                        // 이벤트 카드의 memo2는 현재 탭에서 열기
                        const isEventMemo2 = item?.type === 'events' && item?.storeUrl?.includes('/memo2');
                        const openTarget = isEventMemo2 ? '_self' : '_blank';
                        window.open(item.storeUrl, openTarget);
                      } else {
                        const searchQuery = encodeURIComponent(item.title);
                        if (item.store === 'google-play') {
                          window.open(`https://play.google.com/store/search?q=${searchQuery}&c=apps`, '_blank');
                        } else if (item.store === 'app-store') {
                          window.open(`https://apps.apple.com/search?term=${searchQuery}`, '_blank');
                        } else {
                          // 기본값으로 구글플레이 사용
                          window.open(`https://play.google.com/store/search?q=${searchQuery}&c=apps`, '_blank');
                        }
                      }
                    }}
                  >
                    <User className="h-3 w-3" />
                    See App
                  </Button>
                  
                  {/* Store Badge - 선택된 스토어에 따라 동적 표시 */}
                  {item.store && (
                    <div className="flex gap-2">
                      <img 
                        src={item.store === 'google-play' ? "/google-play-badge.png" : "/app-store-badge.png"}
                        alt={item.store === 'google-play' ? "Get it on Google Play" : "Download on the App Store"}
                        className="h-6 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          if (item.storeUrl) {
                            // 이벤트 카드의 memo2는 현재 탭에서 열기
                            const isEventMemo2 = item?.type === 'events' && item?.storeUrl?.includes('/memo2');
                            const openTarget = isEventMemo2 ? '_self' : '_blank';
                            window.open(item.storeUrl, openTarget);
                          } else {
                            const searchQuery = encodeURIComponent(item.title);
                            if (item.store === 'google-play') {
                              window.open(`https://play.google.com/store/search?q=${searchQuery}&c=apps`, '_blank');
                            } else {
                              window.open(`https://apps.apple.com/search?term=${searchQuery}`, '_blank');
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 페이지네이션 - 6개 이상일 때만 표시 (Events는 제외) */}
      {items.length > itemsPerPage && type !== 'events' && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          {/* 이전 페이지 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onMouseEnter={blockTranslationFeedback}
          >
            ←
          </Button>

          {/* 페이지 번호들 */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(page)}
              className={
                currentPage === page
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
              }
              onMouseEnter={blockTranslationFeedback}
            >
              PAGE {page}
            </Button>
          ))}

          {/* 다음 페이지 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onMouseEnter={blockTranslationFeedback}
          >
            →
          </Button>
        </div>
      )}

      {/* 페이지 정보 */}
      {items.length > 0 && (
        <div className="text-center text-gray-400 text-sm mt-4" onMouseEnter={blockTranslationFeedback}>
          {startIndex + 1}-{Math.min(endIndex, items.length)} of {items.length} items
        </div>
      )}

      {/* 업로드 다이얼로그 */}
      {isAdmin && (
        <>
          {type === 'featured' ? (
            <AdminFeaturedUploadDialog
              isOpen={isUploadDialogOpen}
              onClose={() => setIsUploadDialogOpen(false)}
              onUploadSuccess={handleUploadSuccess}
              targetGallery={type}
            />
          ) : type === 'events' ? (
            <AdminEventsUploadDialog
              isOpen={isUploadDialogOpen}
              onClose={() => setIsUploadDialogOpen(false)}
              onUploadSuccess={handleUploadSuccess}
              targetGallery={type}
            />
          ) : (
            <AdminUploadDialog
              isOpen={isUploadDialogOpen}
              onClose={() => setIsUploadDialogOpen(false)}
              onUploadSuccess={handleUploadSuccess}
              targetGallery={type}
            />
          )}
        </>
      )}
    </div>
  );
}
