import { redirect } from 'next/navigation';

export default async function EditPropertyIndexPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    redirect(`/hote/logements/${slug}/modifier/details`);
}

