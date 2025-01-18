import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SlidersHorizontal, Search, CalendarIcon, Tags, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

import type { DateRange } from 'react-day-picker';

// Using DateRange from react-day-picker

import { api } from '@/services/api';
export type Filters = Parameters<typeof api.getTasks>[0];

interface FilterPanelProps {
  filters: NonNullable<Filters>;
  onChangeFilters: (filters: NonNullable<Filters>) => void;
}

export function FilterPanel({ filters, onChangeFilters }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = React.useState<NonNullable<Filters>>({
    ...filters,
    advancedSearch: filters.advancedSearch || {}
  });
  const [isOpen, setIsOpen] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showLabels, setShowLabels] = React.useState(false);

  type FilterValue = string | boolean | string[] | undefined;
  const handleFilterChange = (key: keyof NonNullable<Filters>, value: FilterValue): void => {
    const newFilters = {
      ...localFilters,
      [key]: value === 'all' ? undefined : value || undefined,
    };
    setLocalFilters(newFilters);
  };

  const handleAdvancedSearchChange = (key: keyof NonNullable<NonNullable<Filters>['advancedSearch']>, value: string) => {
    const newFilters = {
      ...localFilters,
      advancedSearch: {
        ...localFilters.advancedSearch,
        [key]: value || undefined,
      },
    };
    setLocalFilters(newFilters);
  };

  const handleDateRangeChange = (key: 'createdAt' | 'updatedAt', range: DateRange | undefined) => {
    const newFilters = {
      ...localFilters,
      [key]: range,
    };
    setLocalFilters(newFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = {
      ...localFilters,
      search: e.target.value || undefined,
    };
    setLocalFilters(newFilters);
    onChangeFilters(newFilters); // Apply search immediately
  };

  const handleApplyFilters = () => {
    onChangeFilters(localFilters);
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    const resetFilters = {};
    setLocalFilters(resetFilters);
    onChangeFilters(resetFilters);
    setIsOpen(false);
  };

  return (
    <div className="flex gap-2">
      <div className="relative w-64">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search tasks... (/)"
          value={localFilters.search || ''}
          onChange={handleSearchChange}
          className="pl-8"
        />
      </div>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter Tasks</SheetTitle>
            <SheetDescription>
              Apply filters to narrow down your task list
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-6 py-4 max-h-[80vh] overflow-y-auto pr-4">
            {/* Basic Filters */}
            <div className="space-y-4">
              <h3 className="font-medium">Basic Filters</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={localFilters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="To-Do">To-Do</SelectItem>
                    <SelectItem value="In-Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={localFilters.priority}
                  onValueChange={(value) => handleFilterChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Integration</label>
                <Select
                  value={localFilters.integration}
                  onValueChange={(value) => handleFilterChange('integration', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All integrations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All integrations</SelectItem>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="jira">Jira</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Relationship Filters */}
            <div className="space-y-4">
              <h3 className="font-medium">Relationship Filters</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasBlockingTasks"
                  checked={localFilters.hasBlockingTasks}
                  onCheckedChange={(checked) => handleFilterChange('hasBlockingTasks', checked)}
                />
                <label htmlFor="hasBlockingTasks" className="text-sm font-medium">
                  Has blocking tasks
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isBlockingOthers"
                  checked={localFilters.isBlockingOthers}
                  onCheckedChange={(checked) => handleFilterChange('isBlockingOthers', checked)}
                />
                <label htmlFor="isBlockingOthers" className="text-sm font-medium">
                  Is blocking other tasks
                </label>
              </div>
            </div>

            {/* Date Filters */}
            <div className="space-y-4">
              <h3 className="font-medium">Date Filters</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">Created Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.createdAt?.from ? (
                        <>
                          {format(localFilters.createdAt.from, "LLL dd, y")} -{" "}
                          {localFilters.createdAt.to ? format(localFilters.createdAt.to, "LLL dd, y") : ""}
                        </>
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      selected={{
                        from: localFilters.createdAt?.from,
                        to: localFilters.createdAt?.to,
                      }}
                      onSelect={(range) => handleDateRangeChange('createdAt', range)}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Updated Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.updatedAt?.from ? (
                        <>
                          {format(localFilters.updatedAt.from, "LLL dd, y")} -{" "}
                          {localFilters.updatedAt.to ? format(localFilters.updatedAt.to, "LLL dd, y") : ""}
                        </>
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      selected={{
                        from: localFilters.updatedAt?.from,
                        to: localFilters.updatedAt?.to,
                      }}
                      onSelect={(range) => handleDateRangeChange('updatedAt', range)}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Labels & Assignee */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  <h3 className="font-medium">Labels & Assignee</h3>
                  {(localFilters.labels?.length || localFilters.assignee) && (
                    <Badge variant="secondary" className="font-normal">Active</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLabels(!showLabels)}
                >
                  {showLabels ? "Hide" : "Show"}
                </Button>
              </div>
              {showLabels && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Labels</label>
                    <Select
                      value={localFilters.labels?.[0] || ''}
                      onValueChange={(value: string) => handleFilterChange('labels', value ? [value] : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select label" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All labels</SelectItem>
                        <SelectItem value="bug">Bug</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="enhancement">Enhancement</SelectItem>
                        <SelectItem value="documentation">Documentation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Assignee</span>
                      </div>
                    </label>
                    <Select
                      value={localFilters.assignee || ''}
                      onValueChange={(value: string) => handleFilterChange('assignee', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All assignees</SelectItem>
                        <SelectItem value="me">Assigned to me</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Search */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Advanced Search</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "Hide" : "Show"}
                </Button>
              </div>
              {showAdvanced && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      placeholder="Search in title..."
                      value={localFilters.advancedSearch?.title || ''}
                      onChange={(e) => handleAdvancedSearchChange('title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      placeholder="Search in description..."
                      value={localFilters.advancedSearch?.description || ''}
                      onChange={(e) => handleAdvancedSearchChange('description', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Source URL</label>
                    <Input
                      placeholder="Filter by source URL..."
                      value={localFilters.advancedSearch?.sourceUrl || ''}
                      onChange={(e) => handleAdvancedSearchChange('sourceUrl', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Issue Key</label>
                    <Input
                      placeholder="Filter by issue key..."
                      value={localFilters.issueKey || ''}
                      onChange={(e) => handleFilterChange('issueKey', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
