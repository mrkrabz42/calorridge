import { useState, useCallback, useEffect } from 'react';
import { Meal } from '../types';
import { mealsService } from '../services/mealsService';

const PAGE_SIZE = 20;

interface GroupedMeals {
  date: string;
  meals: Meal[];
}

export function useMealHistory() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (pageNum: number, refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await mealsService.getMealsPaginated(pageNum, PAGE_SIZE);
      if (refresh || pageNum === 0) {
        setMeals(data);
      } else {
        setMeals((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPage(0);
  }, []);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadPage(page + 1);
    }
  }, [isLoading, hasMore, page, loadPage]);

  const refresh = useCallback(() => {
    loadPage(0, true);
  }, [loadPage]);

  const grouped = useCallback((): GroupedMeals[] => {
    const map = new Map<string, Meal[]>();
    for (const meal of meals) {
      const arr = map.get(meal.meal_date) ?? [];
      arr.push(meal);
      map.set(meal.meal_date, arr);
    }
    return Array.from(map.entries()).map(([date, meals]) => ({ date, meals }));
  }, [meals]);

  return {
    meals,
    grouped: grouped(),
    isLoading,
    isRefreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    removeMeal: (id: string) => setMeals((prev) => prev.filter((m) => m.id !== id)),
  };
}
