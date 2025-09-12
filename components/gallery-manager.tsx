"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowLeft, Upload, Trash2, Edit } from "lucide-react";
import { blockTranslationFeedback, createAdminButtonHandler } from "@/lib/translation-utils";
import { AdminUploadDialog } from "./admin-upload-dialog";
import { AdminFeaturedUploadDialog } from "./admin-featured-upload-dialog";
import { AdminEventsUploadDialog } from "./admin-events-upload-dialog";

export interface GalleryItem {
  id: string;
  title: string;
  content: string;
  author: string;
  imageUrl?: string;
  publishDate: string;
  tags?: string[];
  isPublished: boolean;
  type: "gallery" | "featured" | "events" | "normal";
  store?: "google-play" | "app-store";
  storeUrl?: string;
  appCategory?: "normal" | "featured" | "events";
  status?: "published" | "development" | "in-review";
}

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
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [likes, setLikes] = useState<{ [key: string]: number }>({});
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const loadItems = async () => {
    try {
      const response = await fetch(`/api/gallery?type=${type}`);
      if (response.ok) {
        const data = await response.json();
        if (type === "gallery") {
          setItems(
            data.filter(
              (item: GalleryItem) =>
                item.isPublished ||
                item.status === "in-review" ||
                item.status === "published"
            )
          );
        } else {
          setItems(data.filter((item: GalleryItem) => item.isPublished));
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
      if (confirm(`"${item?.title}"을(를) 삭제하시겠습니까?`)) {
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

  const handleUploadSuccess = () => {
    loadItems();
    setIsUploadDialogOpen(false);
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

      {/* 관리자 업로드 버튼 (normal이면 숨김) */}
      {isAdmin && type !== "normal" && (
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
          currentItems.map((item, index) => (
            <Card
              key={item.id}
              className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{ backgroundColor: "#D1E2EA" }}
              onMouseEnter={blockTranslationFeedback}
            >
              <div className="relative">
                {/* 이미지 */}
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

                {/* 상태 배지 */}
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-green-500 text-white text-xs">
                    {item.appCategory || item.type}
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

      {/* 업로드 다이얼로그 */}
      {isAdmin && (
        <>
          {type === "featured" ? (
            <AdminFeaturedUploadDialog
              isOpen={isUploadDialogOpen}
              onClose={() => setIsUploadDialogOpen(false)}
              onUploadSuccess={handleUploadSuccess}
              targetGallery={type}
            />
          ) : type === "events" ? (
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
