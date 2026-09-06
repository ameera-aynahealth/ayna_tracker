import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ayna Tracker",
    short_name: "ayna Tracker",
    description: "ayna's private internal work tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F1E8",
    theme_color: "#F7F1E8",
    orientation: "portrait-primary",
    scope: "/",
  };
}
