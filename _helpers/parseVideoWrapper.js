export default function parseVideoWrapper(wrapper) {
  if (!wrapper || !wrapper.fields) {
    return null;
  }

  const { videoUrl, videoTitle, videoCaption } = wrapper.fields;

  if (!videoUrl) {
    return null;
  }

  return {
    url: videoUrl,
    title: videoTitle || '',
    caption: videoCaption || null,
  };
}
