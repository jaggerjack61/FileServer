import type { OfficeEmbeddedImage } from '@/types';

interface EmbeddedImagesProps {
  images: OfficeEmbeddedImage[];
  caption?: string;
}

export function EmbeddedImages({ images, caption = 'Preserved embedded media' }: EmbeddedImagesProps) {
  if (!images.length) {
    return null;
  }

  return (
    <section className="mt-8 rounded-[22px] border border-gray-200 bg-gray-50/80 p-5 text-gray-700 shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-slate-500">Media Shelf</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{caption}</p>
        </div>
        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
          {images.length} item{images.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((image, index) => (
          <figure
            key={`embedded-image-${index}`}
            className="overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/90"
          >
            <img
              src={image.dataUri}
              alt={image.altText || image.name || `Embedded media ${index + 1}`}
              className="h-52 w-full bg-gray-100 object-contain dark:bg-slate-950/70"
            />
            <figcaption className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-white/10 dark:text-slate-400">
              {image.name || `Embedded asset ${index + 1}`}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}