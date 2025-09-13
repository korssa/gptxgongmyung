"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { blockTranslationFeedback } from "@/lib/translation-utils";
import { AdminFeaturedUploadDialog } from "./admin-featured-upload-dialog";
import { AdminEventsUploadDialog } from "./admin-events-upload-dialog";
import { AppItem } from "@/types";
import { AppCard } from "./app-card";
// no direct Image usage in horizontal scroller

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
  // Horizontal scroller: no pagination
  // Admin upload dialog states (featured/events 전용)
  const [isFeaturedDialogOpen, setFeaturedDialogOpen] = useState(false);
  const [isEventsDialogOpen, setEventsDialogOpen] = useState(false);

  const loadItems = useCallback(async () => {
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
    } catch {
      // noop
    }
  }, [type]);

  useEffect(() => {
    loadItems();
  }, [type, loadItems]);

  // no pagination adjustments needed

  // delete handler removed in mini scroller view

  // pagination removed; render all items in a horizontal scroller

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

      {/* Admin: featured / events 업로드 버튼 (gallery/normal은 숨김) */}
      {isAdmin && (type === "featured" || type === "events") && (
        <div className="flex justify-end">
          {type === "featured" ? (
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setFeaturedDialogOpen(true)}
              onMouseEnter={blockTranslationFeedback}
            >
              + Add Featured
            </Button>
          ) : (
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setEventsDialogOpen(true)}
              onMouseEnter={blockTranslationFeedback}
            >
              + Add Event
            </Button>
          )}
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

  {/* 가로 스크롤 카드 행 */}
  <div className="flex flex-row gap-4 overflow-x-auto py-4 px-2">
        {items.length === 0 ? (
          type !== "normal" && (
            <div className="col-span-full">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center text-gray-400">
                  {"아직 업로드된 갤러리 아이템이 없습니다."}
                </CardContent>
              </Card>
            </div>
          )
        ) : (
          items.map((item) => (
            <AppCard
              key={item.id}
              app={item}
              viewMode="mini"
              isFeatured={item.isFeatured}
              isEvent={item.isEvent}
            />
          ))
        )}
      </div>

      {/* pagination removed for horizontal scroller */}

      {/* 업로드 다이얼로그 (admin 전용): featured/events에서만 동작 */}
      {isAdmin && type === "featured" && (
        <AdminFeaturedUploadDialog
          isOpen={isFeaturedDialogOpen}
          onClose={() => setFeaturedDialogOpen(false)}
          onUploadSuccess={() => {
            setFeaturedDialogOpen(false);
            loadItems();
          }}
          targetGallery={type}
        />
      )}
      {isAdmin && type === "events" && (
        <AdminEventsUploadDialog
          isOpen={isEventsDialogOpen}
          onClose={() => setEventsDialogOpen(false)}
          onUploadSuccess={() => {
            setEventsDialogOpen(false);
            loadItems();
          }}
          targetGallery={type}
        />
      )}
    </div>
  );
}
export default GalleryManager;
