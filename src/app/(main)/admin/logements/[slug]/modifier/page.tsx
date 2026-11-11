import { redirect } from 'next/navigation';

export default async function AdminEditPropertyIndexPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    redirect(`/admin/logements/${slug}/modifier/details`);
}

