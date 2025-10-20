import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import PageTitle from './PageTitle'
import styles from './CreateEvent.module.css'

export default function CreateEvent() {
  const { user } = useAuth()
  const router = useRouter()
  // Get today's date in the format required for datetime-local input
  const getTodayDateTime = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    starts_at: getTodayDateTime(),
    ends_at: getTodayDateTime(),
    city: '',
    state: '',
    zip_code: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }



  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }
      
      setBannerFile(file)
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setBannerPreview(previewUrl)
    }
  }

  const uploadBannerImage = async () => {
    if (!bannerFile) return null
    
    try {
      setUploading(true)
      
      // Generate unique filename
      const fileExt = bannerFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('event_banner_images')
        .upload(fileName, bannerFile)
      
      if (error) {
        throw error
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('event_banner_images')
        .getPublicUrl(data.path)
      
      return urlData.publicUrl
    } catch (err) {
      console.error('Error uploading banner image:', err.message)
      setError('Failed to upload banner image')
      throw err
    } finally {
      setUploading(false)
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user) {
      setError('You must be logged in to create an event')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Upload banner image if provided
      let bannerImageUrl = null
      if (bannerFile) {
        bannerImageUrl = await uploadBannerImage()
      }

      // Prepare event data with only the fields that should be saved
      const eventData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        host_id: user.id,
        banner_image_url: bannerImageUrl
      }

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()

      if (error) {
        throw error
      }

      // Show success popup and navigate to manage event page
      setTimeout(() => {
        alert('Event created successfully!')
        router.push(`/manage-event/${data[0].id}`)
      }, 1000)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className={styles.createEvent}>
        <PageTitle title="Create Event" subtitle="Host your own gaming event" />
        <div className={styles.authRequired}>
          Please log in to create an event.
        </div>
      </div>
    )
  }

  return (
    <div className={styles.createEvent}>
      <PageTitle title="Create Event" subtitle="Host your own gaming event" />
      

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.formContainer}>
        <div className={styles.twoColumnLayout}>
          <div className={styles.bannerColumn}>
            <div className={styles.bannerImage}>
              {bannerPreview ? (
                <img 
                  src={bannerPreview} 
                  alt="Banner preview" 
                  className={styles.bannerPreview}
                />
              ) : (
                <div className={styles.bannerPlaceholder}>
                  <div className={styles.uploadText}>Upload banner image</div>
                </div>
              )}
              <input
                type="file"
                id="bannerFile"
                name="bannerFile"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              <label htmlFor="bannerFile" className={styles.fileInputLabel}>
                {bannerFile ? 'Change Image' : 'Choose Image'}
              </label>
              {bannerFile && (
                <button
                  type="button"
                  onClick={() => {
                    setBannerFile(null)
                    setBannerPreview(null)
                    // Reset file input
                    const fileInput = document.getElementById('bannerFile')
                    if (fileInput) fileInput.value = ''
                  }}
                  className={styles.removeImageButton}
                >
                  Remove Image
                </button>
              )}
            </div>
          </div>

          <div className={styles.formColumn}>
            <form onSubmit={handleSubmit} className={styles.form}>

        <div className={styles.formGroup}>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className={styles.titleInput}
            placeholder="Event Title"
          />
        </div>

        <div className={styles.dateTimeSection}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <input
                type="datetime-local"
                id="starts_at"
                name="starts_at"
                value={formData.starts_at}
                onChange={handleInputChange}
                required
                className={styles.input}
                placeholder="Start Date & Time"
              />
            </div>

            <div className={styles.formGroup}>
              <input
                type="datetime-local"
                id="ends_at"
                name="ends_at"
                value={formData.ends_at}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="End Date & Time"
              />
            </div>
          </div>
        </div>

        <div className={styles.descriptionSection}>
          <div className={styles.formGroup}>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Event Description"
              rows="3"
            />
          </div>
        </div>

        <div className={styles.locationSection}>
          <div className={styles.formRowThree}>
            <div className={styles.formGroup}>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Address"
              />
            </div>

            <div className={styles.formGroup}>
              <input
                type="text"
                id="zip_code"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Zip Code"
              />
            </div>

            <div className={styles.formGroup}>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="City"
              />
            </div>

            <div className={styles.formGroup}>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="State"
              />
            </div>
          </div>
        </div>



            <button 
              type="submit" 
              disabled={loading || uploading}
              className={styles.submitButton}
            >
              {uploading ? 'Uploading Image...' : loading ? 'Creating Event...' : 'Create Event'}
            </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
