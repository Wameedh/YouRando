import React from "react";
import "./VideoCard.css"; // We'll create this CSS file next

// Basic duration parser (Can be improved significantly)
function parseDuration(durationString) {
  if (!durationString) return "";
  // Example: PT14M22S -> 14:22, PT1H5M3S -> 1:05:03
  const match = durationString.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  let result = "";
  if (hours > 0) {
    result += `${hours}:${minutes.toString().padStart(2, "0")}:`;
  } else {
    result += `${minutes}:`;
  }
  result += seconds.toString().padStart(2, "0");
  return result;
}

function VideoCard({ video }) {
  if (!video) {
    return null; // Don't render if video data is missing
  }

  const duration = parseDuration(video.duration);

  return (
    <div className="video-card">
      <a
        href={`https://www.youtube.com/watch?v=${video.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="video-thumbnail-link"
      >
        <img
          src={video.thumbnailUrl}
          alt={`Thumbnail for ${video.title}`}
          className="video-thumbnail"
          loading="lazy" // Lazy load images for performance
        />
        {duration && <span className="video-duration">{duration}</span>}
      </a>
      <div className="video-details">
        <h3 className="video-title" title={video.title}>
          {video.title}
        </h3>
        <p className="video-channel" title={video.channelTitle}>
          {video.channelTitle}
        </p>
        {/* Optionally add view count or published date later */}
      </div>
    </div>
  );
}

export default VideoCard;
