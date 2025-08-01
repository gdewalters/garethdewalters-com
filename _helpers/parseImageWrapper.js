export default function parseImageWrapper(wrapper) {
  if (!wrapper || !wrapper.fields) {
    return null;
  }

  const {
    imageFile,
    imageAlternativeText,
    imageCaption,
    creatorPhotographer,
    licenceInformation,
  } = wrapper.fields;

  if (!imageFile?.fields?.file?.url) {
    return null;
  }

  const asset = imageFile.fields;

  return {
    url: `https:${asset.file.url}`,
    alt: imageAlternativeText || asset.title || '',
    caption: imageCaption || null,
    photographer: creatorPhotographer || null,
    licence: licenceInformation || null,
    details: asset.file.details,
  };
}
