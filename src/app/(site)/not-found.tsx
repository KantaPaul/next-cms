import Link from 'next/link';

export default function SiteNotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-5 py-28 text-center">
      <p className="s-primary-text text-sm font-semibold">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="s-muted mt-3">The page you are looking for does not exist or is not published yet.</p>
      <Link href="/" className="s-btn s-btn-primary mt-8">
        Back to home
      </Link>
    </section>
  );
}
