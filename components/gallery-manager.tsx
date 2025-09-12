"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Edit, Star, Download } from "lucide-react";
import { blockTranslationFeedback, createAdminButtonHandler } from "@/lib/translation-utils";
import { AdminFeaturedUploadDialog } from "./admin-featured-upload-dialog";
import { AdminEventsUploadDialog } from "./admin-events-upload-dialog";
import { AppItem } from "@/types";
import Image from "next/image";

interface GalleryManagerProps {
  type: "gallery" | "featured" | "events" | "normal";
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
  const [items, setItems] = useState<AppItem[]>([]);
  const [likes, setLikes] = useState<{ [key: string]: number }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const loadItems = async () => {
    try {
      const response = await fetch(`/api/gallery?type=${type}`);
      if (response.ok) {
        const data = await response.json();
        if (type === "gallery" || type === "normal") {
          setItems(
            data.filter(
              (item: AppItem) =>
                item.status === "published" ||
                item.status === "in-review" ||
                item.status === "development"
            )
          );
        } else {
          setItems(data.filter((item: AppItem) => item.status === "published"));
        }
      }
    } catch (error) {}
  };

  useEffect(() => {
    loadItems();
    const savedLikes = localStorage.getItem(`gallery-likes-${type}`);
    if (savedLikes) setLikes(JSON.parse(savedLikes));
  }, [type]);

  const handleDelete = (itemId: string) => {
    createAdminButtonHandler(async () => {
      const item = items.find((item) => item.id === itemId);
      if (confirm(`"${item?.name}"을(를) 삭제하시겠습니까?`)) {
        try {
          const response = await fetch(`/api/gallery?type=${type}&id=${itemId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          if (response.ok) {
            setItems((prev) => prev.filter((item) => item.id !== itemId));
          } else {
            alert("삭제에 실패했습니다.");
          }
        } catch (error) {
          alert("삭제 중 오류가 발생했습니다.");
        }
      }
    })();
  };

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <div className="space-y-6">
      {/* 제목/설명 (normal이면 숨김) */}
      {type !== "normal" && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="text-gray-400" onMouseEnter={blockTranslationFeedback}>
              {description}
            </p>
          </div>
        </div>
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

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {currentItems.length === 0 ? (
          type !== "normal" && (
            <div className="col-span-full">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center text-gray-400">
                  {items.length === 0
                    ? "아직 업로드된 갤러리 아이템이 없습니다."
                    : "이 페이지에는 더 이상 아이템이 없습니다."}
                </CardContent>
              </Card>
            </div>
          )
        ) : (
          currentItems.map((item) => (
            <Card
              key={item.id}
              className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{ backgroundColor: "#D1E2EA" }}
              onMouseEnter={blockTranslationFeedback}
            >
              <div className="relative">
                {/* Screenshot/App Preview */}
                <div className="aspect-square overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 relative">
                  {item.screenshotUrls && item.screenshotUrls.length > 0 ? (
                    <Image
                      src={item.screenshotUrls[0]}
                      alt={item.name}
                      fill
                      unoptimized={item.screenshotUrls[0].includes('vercel-storage.com') || item.screenshotUrls[0].includes('blob.vercel-storage.com')}
                      className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center text-6xl">
                      📱
                    </div>
                  )}
                </div>

                {/* Store Badge */}
                <div className="absolute bottom-2 left-2">
                  <Badge className={`text-white text-xs ${
                    item.status === 'published' 
                      ? 'bg-green-500' 
                      : item.status === 'in-review' 
                        ? 'bg-orange-500' 
                        : 'bg-gray-500'
                  }`}>
                    {item.status}
                  </Badge>
                </div>

                {/* Admin 버튼 */}
                {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
                      onClick={() => console.log("Edit:", item.id)}
                      onMouseEnter={blockTranslationFeedback}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
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
                  <Image
                    src={item.iconUrl}
                    alt={item.name}
                    width={48}
                    height={48}
                    unoptimized={item.iconUrl.includes('vercel-storage.com') || item.iconUrl.includes('blob.vercel-storage.com')}
                    className="w-12 h-12 rounded-xl object-cover object-center flex-shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMiA2QzEwLjM0IDYgOSA3LjM0IDkgOUM5IDEwLjY2IDEwLjM0IDEyIDEyIDEyQzEzLjY2IDEyIDE1IDEwLjY2IDE1IDlDMTUgNy4zNCAxMy42NiA2IDEyIDZaTTEyIDRDMTQuNzYgNCAxNyA2LjI0IDE3IDlDMTcgMTEuNzYgMTQuNzYgMTQgMTIgMTRDOS4yNCAxNCA3IDExLjc2IDcgOUM3IDYuMjQgOS4yNCA0IDEyIDRaTTEyIDE2QzEwLjM0IDE2IDkgMTcuMzQgOSAxOUg3QzcgMTYuMjQgOS4yNCAxNCAxMiAxNEMxNC43NiAxNCAxNyAxNi4yNCAxNyAxOUgxNUMxNSAxNy4zNCAxMy42NiAxNiAxMiAxNloiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 truncate notranslate" translate="no">{item.name}</h3>
                    <p className="text-sm text-muted-foreground truncate notranslate" translate="no">{item.developer}</p>
                  </div>
                </div>

                {/* Rating and Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{item.rating}</span>
                    </div>
                    <span>{item.downloads}</span>
                  </div>
                  <span>{item.version}</span>
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

              {/* Download Section */}
              <CardFooter className="w-full bg-[#84CC9A] border-t border-gray-300 px-4 py-2">
                <div className="flex flex-col items-start space-y-1 w-full">
                  {/* Download Button */}
                  <div className="w-full">
                    {item.status === "published" ? (
                      <Button
                        size="sm"
                        className="h-6 px-3 text-xs bg-green-700 hover:bg-green-800 text-white flex items-center gap-1 whitespace-nowrap min-w-[120px] justify-start"
                        onClick={() => {
                          if (item.storeUrl) {
                            window.open(item.storeUrl, '_blank');
                          }
                        }}
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-6 px-3 text-xs bg-gray-500 text-white flex items-center gap-1 min-w-[120px] justify-start"
                        disabled
                      >
                        Coming soon
                      </Button>
                    )}
                  </div>

                  {/* Store Badge */}
                  <div className="h-6">
                    <Image
                      src={item.store === "google-play" ? "/google-play-badge.png" : "/app-store-badge.png"}
                      alt="스토어 배지"
                      width={100}
                      height={24}
                      className="h-6 object-contain"
                    />
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {items.length > itemsPerPage && type !== "events" && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </Button>

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
            >
              PAGE {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="text-center text-gray-400 text-sm mt-4">
          {startIndex + 1}-{Math.min(endIndex, items.length)} of {items.length} items
        </div>
      )}

      {/* 업로드 다이얼로그 → Upload 버튼이 없으니 자동 열리는 일도 없음 */}
      {isAdmin && (
        <>
          {type === "featured" && (
            <AdminFeaturedUploadDialog
              isOpen={false}
              onClose={() => {}}
              onUploadSuccess={loadItems}
              targetGallery={type}
            />
          )}
          {type === "events" && (
            <AdminEventsUploadDialog
              isOpen={false}
              onClose={() => {}}
              onUploadSuccess={loadItems}
              targetGallery={type}
            />
          )}
        </>
      )}
    </div>
  );
}
