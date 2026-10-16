/**
 * React Query bindings for the depot-assignment import.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { depotAssignmentsApi } from './api';

/** Downloads the template. A mutation, not a query: it is an action, not state. */
export function useDownloadTemplate() {
  return useMutation({
    mutationFn: () => depotAssignmentsApi.downloadTemplate(),
  });
}

/**
 * Uploads a workbook.
 *
 * Invalidates planning on success only. A refused import wrote nothing, so refetching
 * the board would redraw identical data and imply something had changed.
 */
export function useImportAssignments() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => depotAssignmentsApi.import(file),
    onSuccess: (result) => {
      if (result.imported) {
        client.invalidateQueries({ queryKey: ['planning'] });
      }
    },
  });
}

/** Downloads the error report for a file that failed. Never writes anything. */
export function useDownloadErrorReport() {
  return useMutation({
    mutationFn: (file: File) => depotAssignmentsApi.downloadErrorReport(file),
  });
}
