import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search as SearchIcon, Star, StarOff, Clock, Filter } from 'lucide-react';
import { Task } from '@/types/Task';

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
}

interface SearchFilters {
  status?: string;
  priority?: string;
  integration?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

export function Search() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchResults] = useState<Task[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const handleSearch = useCallback(() => {
    // TODO: Implement actual search logic with API
    console.log('Searching with:', { query, filters });
    
    // Add to recent searches
    if (query && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev].slice(0, 5));
    }
  }, [query, filters, recentSearches]);

  const saveSearch = () => {
    const newSavedSearch: SavedSearch = {
      id: Math.random().toString(),
      name: query || 'Unnamed Search',
      query,
      filters,
    };
    setSavedSearches([...savedSearches, newSavedSearch]);
  };

  const removeSavedSearch = (id: string) => {
    setSavedSearches(savedSearches.filter(search => search.id !== id));
  };

  const loadSavedSearch = (search: SavedSearch) => {
    setQuery(search.query);
    setFilters(search.filters);
    handleSearch();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Advanced Search</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button onClick={handleSearch}>Search</Button>
          </div>

          {showFilters && (
            <div className="grid gap-4 p-4 border rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any status</SelectItem>
                      <SelectItem value="To-Do">To-Do</SelectItem>
                      <SelectItem value="In-Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={filters.priority}
                    onValueChange={(value) => setFilters({ ...filters, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any priority</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Integration</Label>
                  <Select
                    value={filters.integration}
                    onValueChange={(value) => setFilters({ ...filters, integration: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any integration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any integration</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="jira">Jira</SelectItem>
                      <SelectItem value="linear">Linear</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Created After</Label>
                  <Input
                    type="date"
                    value={filters.createdAfter}
                    onChange={(e) => setFilters({ ...filters, createdAfter: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Created Before</Label>
                  <Input
                    type="date"
                    value={filters.createdBefore}
                    onChange={(e) => setFilters({ ...filters, createdBefore: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Updated After</Label>
                  <Input
                    type="date"
                    value={filters.updatedAfter}
                    onChange={(e) => setFilters({ ...filters, updatedAfter: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Searches
              </Label>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery(search);
                      handleSearch();
                    }}
                  >
                    {search}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Saved Searches */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Saved Searches
              </Label>
              <Button variant="outline" size="sm" onClick={saveSearch}>
                Save Current Search
              </Button>
            </div>
            <div className="space-y-2">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start"
                    onClick={() => loadSavedSearch(search)}
                  >
                    {search.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSavedSearch(search.id)}
                  >
                    <StarOff className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4 mt-6">
              <h3 className="font-medium">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map((task) => (
                  <div
                    key={task._id}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
