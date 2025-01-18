import { Card, CardHeader, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';

export function TaskCardSkeleton() {
  return (
    <Card className="cursor-default border border-gray-100/50 bg-white/50 backdrop-blur-sm">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Skeleton className="h-4 w-full mb-3" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
