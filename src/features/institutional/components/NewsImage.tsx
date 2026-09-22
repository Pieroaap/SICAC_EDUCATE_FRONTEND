import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../auth/AuthProvider';
import { getNewsImage } from '../api/institutionalApi';

export function NewsImage({ postId, imageId, title }: { postId: string; imageId: string; title: string }) {
  const { profile } = useAuth();
  const [failedUrl, setFailedUrl] = useState('');
  const image = useQuery({ queryKey: ['news-image', profile?.personaId, postId, imageId], queryFn: () => getNewsImage(postId),
    staleTime: 240_000, refetchInterval: 240_000, retry: false });
  return <div className="news-image">
    {image.isPending ? <p role="status">Cargando imagen…</p> : image.isError || image.data?.url === failedUrl ? <div role="alert">No se pudo cargar la imagen. <Button type="button" variant="secondary" onClick={() => { setFailedUrl(''); void image.refetch(); }}>Reintentar imagen</Button></div>
      : image.data ? <img src={image.data.url} alt={`Imagen de la noticia: ${title}`} loading="lazy" onError={() => setFailedUrl(image.data.url)} /> : null}
  </div>;
}
