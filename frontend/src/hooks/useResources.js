// src/hooks/useResources.js
import { useQuery } from '@tanstack/react-query';
import { getResources, getResource, getCategories } from '../api/resources';

export const resourceKeys = {
  all:        ()       => ['resources'],
  list:       (params) => ['resources', 'list', params],
  detail:     (id)     => ['resources', 'detail', id],
  categories: ()       => ['resources', 'categories'],
  saved:      (params) => ['resources', 'saved', params],
};

export function useResources(params = {}) {
  return useQuery({
    queryKey: resourceKeys.list(params),
    queryFn:  () => getResources(params),
    staleTime: 2 * 60 * 1000,
    keepPreviousData: true, // smooth pagination
  });
}

export function useResource(id) {
  return useQuery({
    queryKey: resourceKeys.detail(id),
    queryFn:  () => getResource(id),
    enabled:  Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: resourceKeys.categories(),
    queryFn:  getCategories,
    staleTime: 30 * 60 * 1000, // categories rarely change
    gcTime:    60 * 60 * 1000,
  });
}
