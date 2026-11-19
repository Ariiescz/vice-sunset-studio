// Screenshot-mode staging for the cover maker: a query string on the page turns the
// editor into a fixed, reproducible scene (photo, layout, grade, caption, export size)
// so a headless browser can capture a clean still. Only active when the URL carries a
// 'shot' parameter; a normal visit is left untouched.

const EXPORT_SIZES = {
  wide: [1920, 1080],
  square: [1080, 1080],
  portrait: [1080, 1350]
};

const DEFAULTS = {
  photo: 'pier',
  caption: 'Sunset Heist',
  subtitle: 'VICE CITY \u2022 2026',
  layout: 'trio',
  grade: 'sunset',
  size: 'wide'
};

function param(query, key, fallback) {
  const value = query.get(key);
  return value === null || value === '' ? fallback : value;
}

export function stageShot(api) {
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (!shot) return Promise.resolve();

  const photo = param(query, 'photo', DEFAULTS.photo);
  const caption = param(query, 'caption', DEFAULTS.caption);
  const subtitle = param(query, 'subtitle', DEFAULTS.subtitle);
  const layout = param(query, 'layout', DEFAULTS.layout);
  const grade = param(query, 'grade', DEFAULTS.grade);
  const size = param(query, 'size', DEFAULTS.size);

  return (async function () {
    await api.loadSample(photo);

    api.setScene({
      layout: layout,
      grade: grade,
      title: caption,
      subtitle: subtitle
    });

    const titleInput = document.getElementById('titleInput');
    if (titleInput) titleInput.value = caption;
    const subtitleInput = document.getElementById('subtitleInput');
    if (subtitleInput) subtitleInput.value = subtitle;

    if (shot === 'cover') {
      document.body.classList.add('shot-cover');
      const canvas = document.getElementById('preview');
      const dims = EXPORT_SIZES[size];
      if (canvas && dims) {
        canvas.width = dims[0];
        canvas.height = dims[1];
      }
      api.render();
    } else if (shot === 'editor') {
      api.render();
    }

    window.__shotReady = true;
    document.title = 'SHOT-READY';
  })();
}
