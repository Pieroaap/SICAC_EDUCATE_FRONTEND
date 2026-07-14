import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { downloadDocument, listDocuments, removeDocument, uploadDocument } from '../api/documentsApi';

export function DocumentsPage() {
  const client = useQueryClient(); const [file, setFile] = useState<File | null>(null);
  const documents = useQuery({ queryKey: ['documents'], queryFn: listDocuments });
  const refresh = () => client.invalidateQueries({ queryKey: ['documents'] });
  const upload = useMutation({ mutationFn: () => uploadDocument(file!), onSuccess: refresh });
  const remove = useMutation({ mutationFn: removeDocument, onSuccess: refresh });
  return <main className="page-shell"><header className="page-heading"><div><p className="eyebrow">Recursos</p><h1>Documentos</h1><p>Archivos privados con descarga temporal y trazabilidad.</p></div></header>
    <section className="detail-panel"><h2>Publicar documento institucional</h2><input accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file"/><Button disabled={!file || upload.isPending} onClick={() => upload.mutate()} type="button">Subir archivo</Button>{upload.isError ? <p className="field-error">No se pudo subir el archivo.</p> : null}</section>
    <section className="portal-grid">{documents.data?.data.map((item) => <article className="portal-card" key={item.id}><span className="eyebrow">{item.tipo}</span><h2>{item.nombreOriginal}</h2><p>{Math.ceil(item.tamanoBytes / 1024)} KiB</p><div className="button-row"><Button onClick={() => void downloadDocument(item.id)} type="button" variant="secondary">Descargar</Button><Button onClick={() => remove.mutate(item.id)} type="button" variant="ghost">Retirar</Button></div></article>)}</section>
  </main>;
}
