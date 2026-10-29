import { redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';

/** Earlier address of the new editor; it now opens from the builder with `?editor=new`. */
export default async function NewEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(PAGES.DASHBOARD.PAGES.EDITOR(id));
}
