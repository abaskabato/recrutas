import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Newspaper } from "lucide-react";

interface Article {
  title: string;
  description: string;
  url: string;
  source: {
    name: string;
  };
  publishedAt: string;
}

export default function LayoffNews() {
  const { data: articles, isLoading, isError } = useQuery<Article[]>({
    queryKey: ['/api/news/layoffs'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/news/layoffs');
      return response.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span>Market & Layoff News</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-1/2 mt-1"></div>
              </div>
            ))}
          </div>
        )}
        {isError && <p className="text-red-500">Could not load news at this time.</p>}
        {articles && articles.length > 0 && (
          <ul className="space-y-4">
            {articles.map((article, index) => (
              <li key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="group">
                  <h4 className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{article.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">{article.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>{article.source.name}</span>
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
         {articles && articles.length === 0 && !isLoading && (
          <p className="text-center text-gray-500 py-4">No recent layoff news found.</p>
        )}
      </CardContent>
    </Card>
  );
}
