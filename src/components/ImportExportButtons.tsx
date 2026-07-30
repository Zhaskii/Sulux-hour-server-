'use client'

import React, { useRef, useState } from 'react'
import { Button, toast } from '@payloadcms/ui'

export function ImportExportButtons() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Get current status from URL parameter where[status][equals]
  let currentStatus = ''
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    currentStatus = params.get('where[status][equals]') || ''
  }

  const handleTabClick = (status: string) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (status) {
      url.searchParams.set('where[status][equals]', status)
    } else {
      url.searchParams.delete('where[status][equals]')
    }
    // Reset page on filter change
    url.searchParams.delete('page')
    window.location.href = url.pathname + url.search
  }

  const handleExport = () => {
    // Open the export link in a new window or trigger download directly
    window.open('/api/products/export', '_blank')
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setIsImporting(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      // Show success/warning toast with summary
      if (data.errorsCount > 0) {
        toast.warning(
          `Import finished with some errors: Created ${data.createdCount}, Updated ${data.updatedCount}, Errors: ${data.errorsCount}`
        )
        // Log detailed errors
        console.error('Import errors:', data.errors)
        if (Array.isArray(data.errors)) {
          data.errors.forEach((err: any) => {
            console.error(`Row ${err.row} [${err.name}]: ${err.error}`)
          })
        }
      } else {
        toast.success(
          `Successfully imported: Created ${data.createdCount}, Updated ${data.updatedCount} products!`
        )
      }

      // Refresh list to show newly imported products
      window.location.reload()
    } catch (error: any) {
      toast.error(`Import failed: ${error?.message || error}`)
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      gap: '16px', 
      marginBottom: '20px', 
      width: '100%',
      flexWrap: 'wrap'
    }}>
      {/* Quick Status Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        alignItems: 'center' 
      }}>
        <button
          type="button"
          onClick={() => handleTabClick('')}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: currentStatus === '' ? '1px solid var(--theme-elevation-200, #cccccc)' : '1px solid var(--theme-elevation-100, #e8e8e8)',
            background: currentStatus === '' ? 'var(--theme-bg, #ffffff)' : 'var(--theme-elevation-50, #f5f5f5)',
            color: currentStatus === '' ? 'var(--theme-text, #000000)' : 'var(--theme-elevation-600, #777777)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            boxShadow: currentStatus === '' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
          className={`status-tab ${currentStatus === '' ? 'active' : ''}`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('active')}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: currentStatus === 'active' ? '1px solid var(--theme-elevation-200, #cccccc)' : '1px solid var(--theme-elevation-100, #e8e8e8)',
            background: currentStatus === 'active' ? 'var(--theme-bg, #ffffff)' : 'var(--theme-elevation-50, #f5f5f5)',
            color: currentStatus === 'active' ? 'var(--theme-text, #000000)' : 'var(--theme-elevation-600, #777777)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            boxShadow: currentStatus === 'active' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
          className={`status-tab ${currentStatus === 'active' ? 'active' : ''}`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('archived')}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: currentStatus === 'archived' ? '1px solid var(--theme-elevation-200, #cccccc)' : '1px solid var(--theme-elevation-100, #e8e8e8)',
            background: currentStatus === 'archived' ? 'var(--theme-bg, #ffffff)' : 'var(--theme-elevation-50, #f5f5f5)',
            color: currentStatus === 'archived' ? 'var(--theme-text, #000000)' : 'var(--theme-elevation-600, #777777)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            boxShadow: currentStatus === 'archived' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
          className={`status-tab ${currentStatus === 'archived' ? 'active' : ''}`}
        >
          Archived
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('draft')}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: currentStatus === 'draft' ? '1px solid var(--theme-elevation-200, #cccccc)' : '1px solid var(--theme-elevation-100, #e8e8e8)',
            background: currentStatus === 'draft' ? 'var(--theme-bg, #ffffff)' : 'var(--theme-elevation-50, #f5f5f5)',
            color: currentStatus === 'draft' ? 'var(--theme-text, #000000)' : 'var(--theme-elevation-600, #777777)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            boxShadow: currentStatus === 'draft' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
          className={`status-tab ${currentStatus === 'draft' ? 'active' : ''}`}
        >
          Draft
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Button
          buttonStyle="secondary"
          onClick={handleExport}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Excel
          </span>
        </Button>

        <Button
          buttonStyle="secondary"
          onClick={handleImportClick}
          disabled={isImporting}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {isImporting ? (
              <span style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                border: '2px solid currentColor',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
            {isImporting ? 'Importing...' : 'Import Excel'}
          </span>
        </Button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx"
          style={{ display: 'none' }}
        />
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .status-tab:not(.active):hover {
          background: var(--theme-elevation-100, #f0f0f0) !important;
          color: var(--theme-text, #000000) !important;
        }
      `}</style>
    </div>
  )
}

export default ImportExportButtons
