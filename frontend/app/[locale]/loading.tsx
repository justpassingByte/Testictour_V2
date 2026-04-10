export default function Loading() {
  return (
    <div>
      {/* Hero Section Skeleton */}
      <section className="py-16 md:py-24 border-b">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="space-y-6 animate-pulse">
              <div className="h-14 bg-muted rounded-md w-3/4"></div>
              <div className="h-5 bg-muted rounded-md w-full"></div>
              <div className="h-5 bg-muted rounded-md w-4/5"></div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="h-12 bg-muted rounded-md w-40"></div>
                <div className="h-12 bg-muted rounded-md w-40"></div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-lg overflow-hidden border shadow-lg bg-muted"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tournaments Skeleton */}
      <section className="py-12 bg-background/60 dark:bg-background/40 backdrop-blur-lg border-t border-b border-white/20">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <div className="h-8 bg-muted rounded-md w-64 mb-2"></div>
              <div className="h-5 bg-muted rounded-md w-96"></div>
            </div>
            <div className="h-6 bg-muted rounded-md w-40 mt-4 md:mt-0"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="border rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-[16/9] bg-muted"></div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="h-5 bg-muted rounded-md w-3/4"></div>
                    <div className="h-4 bg-muted rounded-md w-1/2"></div>
                  </div>
                  <div className="h-10 bg-muted rounded-md w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MiniTour Skeleton */}
      <section className="py-12 bg-primary/5 border-y">
        <div className="container">
          <div className="h-8 bg-muted rounded-md w-64 mb-2"></div>
          <div className="h-5 bg-muted rounded-md w-96 mb-6"></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </div>
                <div className="h-10 bg-muted rounded w-full mt-4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tournament Directory Skeleton */}
      <section className="py-12 bg-background/60 dark:bg-background/40 backdrop-blur-lg border-t border-b border-white/20">
        <div className="container space-y-8">
          <div>
            <div className="h-8 bg-muted rounded-md w-64 mb-2"></div>
            <div className="h-5 bg-muted rounded-md w-96"></div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[16/9] bg-muted rounded-md mb-4"></div>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Skeleton */}
      <section className="py-16 bg-primary/5 border-y">
        <div className="container">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            <div className="h-10 bg-muted rounded-md w-2/3"></div>
            <div className="h-5 bg-muted rounded-md w-full"></div>
            <div className="h-5 bg-muted rounded-md w-5/6"></div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="h-12 bg-muted rounded-md w-40"></div>
              <div className="h-12 bg-muted rounded-md w-40"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
