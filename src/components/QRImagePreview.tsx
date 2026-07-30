'use client'
import React, { useEffect, useState } from 'react'
import { useFormFields } from '@payloadcms/ui'

export default function QRImagePreview() {
  const qrImageValue = useFormFields(([fields]) => fields['paymentDetails.qrImage']?.value) as string | number | { url?: string } | undefined
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!qrImageValue) {
      setImgUrl(null)
      return
    }

    if (typeof qrImageValue === 'object' && qrImageValue !== null && 'url' in qrImageValue) {
      setImgUrl(qrImageValue.url || null)
      return
    }

    // It's an ID, fetch the media document
    setLoading(true)
    fetch(`/api/media/${qrImageValue}`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        setImgUrl(data.url || null)
      })
      .catch(() => {
        setImgUrl(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [qrImageValue])

  if (loading) {
    return <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>Loading payment proof preview...</div>
  }

  if (!imgUrl) {
    return null
  }

  return (
    <div style={{ marginTop: '12px', border: '1px solid #E2DED8', padding: '12px', background: '#FAFAF8', display: 'inline-block', borderRadius: '4px' }}>
      <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#666', marginBottom: '8px' }}>
        Payment Proof Screenshot Preview
      </span>
      <a href={imgUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={imgUrl}
          alt="Payment Proof Screenshot"
          style={{ maxWidth: '300px', maxHeight: '300px', objectFit: 'contain', cursor: 'zoom-in', display: 'block', borderRadius: '2px' }}
        />
      </a>
    </div>
  )
}
