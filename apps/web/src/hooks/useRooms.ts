import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roomsApi, type CreateRoomInput } from '../lib/api';

export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.list,
    refetchInterval: 5000, // poll every 5 s while on lobby
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoomInput) => roomsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roomsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}
