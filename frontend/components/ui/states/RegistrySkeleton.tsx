import { ViewMode } from "@enums/index";
import {
  SkeletonCardGrid,
  SkeletonPagination,
  SkeletonScreen,
  SkeletonTable,
} from "./Skeleton";

/**
 * The loading shape shared by all four registries. Mirrors the *current* view
 * mode, so the placeholder matches what is about to appear rather than
 * rearranging the page the moment data lands.
 *
 * The toolbar is not skeletonised — search and the view toggle are usable while
 * rows load, and greying them out would take away the one thing the user can do.
 */
export function RegistrySkeleton({
  viewMode,
  label,
  columns = 5,
  rows = 8,
}: {
  viewMode: ViewMode;
  label: string;
  columns?: number;
  rows?: number;
}) {
  return (
    <SkeletonScreen label={label}>
      <div className="space-y-3">
        {viewMode === ViewMode.Grid ? (
          <SkeletonCardGrid count={rows} />
        ) : (
          <SkeletonTable rows={rows} columns={columns} />
        )}
        <SkeletonPagination />
      </div>
    </SkeletonScreen>
  );
}
