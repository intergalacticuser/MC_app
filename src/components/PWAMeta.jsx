import { useEffect } from "react";

export default function PWAMeta() {
  useEffect(() => {
    // 1. Manifest (Data URI) - Solves missing manifest.json
    const manifest = {
      short_name: "Make a Match",
      name: "Make a Match: My Planet",
      icons: [
        {
          src: "https://images.unsplash.com/photo-1614730341194-75c60740a071?w=192&h=192&fit=crop&q=80",
          type: "image/jpeg",
          sizes: "192x192"
        },
        {
          src: "https://images.unsplash.com/photo-1614730341194-75c60740a071?w=512&h=512&fit=crop&q=80",
          type: "image/jpeg",
          sizes: "512x512"
        }
      ],
      start_url: "/",
      background_color: "#0B0C15",
      display: "standalone",
      scope: "/",
      start_url: "/",
      theme_color: "#0B0C15",
      related_applications: [],
      prefer_related_applications: false,
      shortcuts: [
        {
          name: "Search",
          url: "/Match",
          icons: [{ src: "https://images.unsplash.com/photo-1614730341194-75c60740a071?w=96&h=96&fit=crop&q=80", sizes: "96x96" }]
        },
        {
          name: "Messages",
          url: "/Messages",
          icons: [{ src: "https://images.unsplash.com/photo-1614730341194-75c60740a071?w=96&h=96&fit=crop&q=80", sizes: "96x96" }]
        }
      ]
    };
    const manifestUrl = `data:application/manifest+json;base64,${btoa(JSON.stringify(manifest))}`;
    
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestUrl;

    // 2. Theme Color
    let themeMetaTag = document.querySelector('meta[name="theme-color"]');
    if (!themeMetaTag) {
      themeMetaTag = document.createElement("meta");
      themeMetaTag.name = "theme-color";
      document.head.appendChild(themeMetaTag);
    }
    themeMetaTag.content = "#0B0C15";

    // 3. Apple Tags
    const metaTags = [
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Make a Match" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover, interactive-widget=resizes-content" }
    ];

    metaTags.forEach(tag => {
      let element = document.querySelector(`meta[name="${tag.name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.name = tag.name;
        document.head.appendChild(element);
      }
      element.content = tag.content;
    });

    // 4. Icons & Splash
    const links = [
      { rel: "apple-touch-icon", href: "https://images.unsplash.com/photo-1614730341194-75c60740a071?w=180&h=180&fit=crop&q=80" },
      { rel: "icon", href: "https://images.unsplash.com/photo-1614730341194-75c60740a071?w=32&h=32&fit=crop&q=80" },
      { rel: "apple-touch-startup-image", href: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1284&h=2778&fit=crop&q=80" }
    ];

    links.forEach(link => {
      let element = document.querySelector(`link[rel="${link.rel}"]`);
      if (!element) {
        element = document.createElement("link");
        element.rel = link.rel;
        document.head.appendChild(element);
      }
      element.href = link.href;
    });

  }, []);

  return null;
}
