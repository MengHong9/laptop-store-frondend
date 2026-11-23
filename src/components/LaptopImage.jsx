import { useState } from 'react'
import { assetUrl } from '../api/client'
import LaptopArt from './LaptopArt'

// Shows the uploaded photo; falls back to the line illustration when the laptop has no photo
// or the image fails to load (deleted file, offline...). The inner component is keyed by the URL so
// a failure for the OLD url is forgotten as soon as a new photo is uploaded.
function Inner({ laptop, className, artClassName }) {
  const [failed, setFailed] = useState(false)
  if (!laptop?.image_url || failed) return <LaptopArt seed={laptop?.id ?? 0} className={artClassName ?? className} />
  return (
    <img
      src={assetUrl(laptop.image_url)}
      alt={laptop.model}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}

export default function LaptopImage(props) {
  return <Inner key={props.laptop?.image_url ?? 'none'} {...props} />
}
