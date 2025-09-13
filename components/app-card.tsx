"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Download } from "lucide-react";
import { useState } from "react";
import { AppItem } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { useAdmin } from "@/hooks/use-admin";
import { blockTranslationFeedback } from "@/lib/translation-utils";
import { AdminCardActionsDialog } from "./admin-card-actions-dialog";
import Image from "next/image";

interface AppCardProps {
  app: AppItem;
  viewMode: "grid" | "list";
  onDelete?: (id: string) => void;
  onEdit?: (app: AppItem) => void;
  onToggleFeatured?: (id: string) => void;
  onToggleEvent?: (id: string) => void;
  onUpdateAdminStoreUrl?: (id: string, adminStoreUrl: string) => void;
  isFeatured?: boolean;
  isEvent?: boolean;
  onRefreshData?: () => Promise<void>;
  onCleanData?: () => Promise<void>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "published":
      return "bg-green-500";
    case "in-review":
      return "bg-yellow-500";
    case "development":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
};

export function AppCard({
  app,
  viewMode,
  onDelete,
  onEdit,
  onToggleFeatured,
  onToggleEvent,
  onUpdateAdminStoreUrl,
  isFeatured = false,
  isEvent = false,
  onRefreshData,
  onCleanData,
}: AppCardProps) {
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const { t } = useLanguage();
  const { isAuthenticated } = useAdmin();

  const isBlobUrl = (url?: string) =>
    !!url &&
    (url.includes("vercel-storage.com") ||
      url.includes("blob.vercel-storage.com"));

  const handleStoreView = () => {
    if (isEvent) {
      window.location.href = "/memo2";
    } else {
      const urlToUse = app.storeUrl;
      if (urlToUse) {
        window.open(urlToUse, "_blank");
      }
    }
  };

  const getButtonText = () => {
    if (app.status === "published") return "Download";
    if (isEvent) return "📝 Memo 2";
    return "Download";
  };

  const handleAdminActions = () => setIsAdminDialogOpen(true);

  // ---------------------- LIST MODE ----------------------
  if (viewMode === "list") {
    return (
      <>
        <Card
          className="flex flex-row overflow-hidden hover:shadow-lg transition-shadow"
          style={{ backgroundColor: "#D1E2EA" }}
          onMouseEnter={blockTranslationFeedback}
        >
          {/* App Icon */}
          <div className="w-24 h-24 flex-shrink-0 p-3">
            <Image
              src={app.iconUrl}
              alt={app.name}
              width={96}
              height={96}
              unoptimized={isBlobUrl(app.iconUrl)}
              className="w-full h-full object-cover object-center rounded-xl"
            />
          </div>

          <CardContent
            className="flex-1 px-2 py-2 space-y-2"
            style={{ backgroundColor: "#D1E2EA" }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className="font-semibold text-lg notranslate app-name-fixed"
                    translate="no"
                  >
                    {app.name}
                  </h3>
                  <Badge
                    className={`text-xs ${getStatusColor(app.status)} text-white`}
                  >
                    {app.status}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  {t("author")}:{" "}
                  <span
                    className="notranslate app-developer-fixed"
                    translate="no"
                  >
                    {app.developer}
                  </span>
                </p>

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {app.description}
                </p>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{app.rating}</span>
                  </div>
                  <span>{app.downloads}</span>
                  <span>{app.version}</span>
                  <span>{app.uploadDate}</span>
                </div>

                {app.tags && (
                  <div className="flex flex-wrap gap-1">
                    {app.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* 초록색 다운로드 영역 */}
                <div className="w-full bg-[#84CC9A] px-2 py-1 mt-1">
                  <div className="flex flex-col items-start space-y-1">
                    <div className="w-full">
                      {app.status === "published" ? (
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs bg-green-700 hover:bg-green-800 text-white flex items-center gap-1 whitespace-nowrap min-w-[120px] justify-start"
                          onClick={handleStoreView}
                        >
                          <Download className="h-3 w-3" />
                          {getButtonText()}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs bg-gray-500 text-white flex items-center gap-1 min-w-[120px] justify-start"
                          disabled
                        >
                          Coming soon
                        </Button>
                      )}
                    </div>
                    <div className="h-7">
                      <Image
                        src={
                          app.store === "google-play"
                            ? "/google-play-badge.png"
                            : "/app-store-badge.png"
                        }
                        alt="스토어 배지"
                        width={120}
                        height={28}
                        className="h-7 object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isAuthenticated && (
                <div
                  className="flex flex-col items-end space-y-2 ml-4"
                  onMouseEnter={blockTranslationFeedback}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAdminActions}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    ⚙️ 관리자 모드
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <AdminCardActionsDialog
          app={app}
          isOpen={isAdminDialogOpen}
          onClose={() => setIsAdminDialogOpen(false)}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggleFeatured={onToggleFeatured}
          onToggleEvent={onToggleEvent}
          onUpdateAdminStoreUrl={onUpdateAdminStoreUrl}
          isFeatured={isFeatured}
          isEvent={isEvent}
          onRefreshData={onRefreshData}
          onCleanData={onCleanData}
        />
      </>
    );
  }

  // ---------------------- GRID MODE ----------------------
  return (
    <>
      <Card
        className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 max-w-[256px] w-full"
        style={{ backgroundColor: "#D1E2EA" }}
        onMouseEnter={blockTranslationFeedback}
      >
        <div className="relative">
          <div className="aspect-square overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 relative">
            {app.screenshotUrls && app.screenshotUrls.length > 0 ? (
              <Image
                src={app.screenshotUrls[0]}
                alt={app.name}
                fill
                unoptimized={isBlobUrl(app.screenshotUrls?.[0])}
                className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl">
                📱
              </div>
            )}
          </div>
          <div className="absolute bottom-2 left-2">
            <Badge
              className={`${getStatusColor(app.status)} text-white text-xs`}
            >
              {app.status}
            </Badge>
          </div>
          {isAuthenticated && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAdminActions}
                className="h-8 w-8 p-0 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                ⚙️
              </Button>
            </div>
          )}
        </div>

        <CardContent
          className="px-2 pt-2 pb-0 space-y-2"
          style={{ backgroundColor: "#D1E2EA" }}
        >
          <div className="flex items-start space-x-3">
            <Image
              src={app.iconUrl}
              alt={app.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold text-base mb-0.5 truncate notranslate app-name-fixed"
                translate="no"
              >
                {app.name}
              </h3>
              <p
                className="text-sm text-muted-foreground truncate notranslate app-developer-fixed"
                translate="no"
              >
                {app.developer}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{app.rating}</span>
              </div>
              <span>{app.downloads}</span>
            </div>
            <span>{app.version}</span>
          </div>

          {app.tags && app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {app.tags.slice(0, 2).map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs px-2 py-0"
                >
                  {tag}
                </Badge>
              ))}
              {app.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{app.tags.length - 2}
                </span>
              )}
            </div>
          )}

          {/* 초록색 다운로드 영역 */}
          <div className="w-full bg-[#84CC9A] px-2 py-1">
            <div className="flex flex-col items-start space-y-1">
              <div className="w-full">
                {app.status === "published" ? (
                  <Button
                    size="sm"
                    className="h-6 px-3 text-xs bg-green-700 hover:bg-green-800 text-white flex items-center gap-1 whitespace-nowrap min-w-[120px] justify-start"
                    onClick={handleStoreView}
                  >
                    <Download className="h-3 w-3" />
                    {getButtonText()}
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
              <div className="h-6">
                <Image
                  src={
                    app.store === "google-play"
                      ? "/google-play-badge.png"
                      : "/app-store-badge.png"
                  }
                  alt="스토어 배지"
                  width={100}
                  height={24}
                  className="h-6 object-contain"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminCardActionsDialog
        app={app}
        isOpen={isAdminDialogOpen}
        onClose={() => setIsAdminDialogOpen(false)}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleFeatured={onToggleFeatured}
        onToggleEvent={onToggleEvent}
        onUpdateAdminStoreUrl={onUpdateAdminStoreUrl}
        isFeatured={isFeatured}
        isEvent={isEvent}
        onRefreshData={onRefreshData}
        onCleanData={onCleanData}
      />
    </>
  );
}

