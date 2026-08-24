import {
  SkeletonPagination,
  SkeletonScreen,
  SkeletonTable,
} from "@components/ui/states";

/**
 * Route-level fallback, shown while a portal page's code chunk is fetched.
 *
 * Deliberately generic: this fires before the page component exists, so it
 * cannot know whether the destination is a registry, the dashboard or a form.
 * Once the page mounts, its own `isLoading` skeleton takes over with the exact
 * shape of the content.
 */
export default function PortalLoading() {
  return (
    <SkeletonScreen label="Loading page">
      <div className="space-y-3">
        <SkeletonTable rows={6} columns={5} />
        <SkeletonPagination />
      </div>
    </SkeletonScreen>
  );
}
