import styles from './ThemeSelector.module.css'

const THEMES = {
  blue: {
    name: 'blue',
    colors: {
      background: '#f0f8ff',
      primary: '#000000',
      secondary: '#e6f3ff',
      accent: '#333333',
      text: '#000000',
      textSecondary: '#666666',
      border: '#000000'
    }
  },
  red: {
    name: 'red',
    colors: {
      background: '#fff0f0',
      primary: '#000000',
      secondary: '#ffe6e6',
      accent: '#333333',
      text: '#000000',
      textSecondary: '#666666',
      border: '#000000'
    }
  },
  green: {
    name: 'green',
    colors: {
      background: '#f0fff0',
      primary: '#000000',
      secondary: '#e6ffe6',
      accent: '#333333',
      text: '#000000',
      textSecondary: '#666666',
      border: '#000000'
    }
  },
  yellow: {
    name: 'yellow',
    colors: {
      background: '#fffef0',
      primary: '#000000',
      secondary: '#fffce6',
      accent: '#333333',
      text: '#000000',
      textSecondary: '#666666',
      border: '#000000'
    }
  },
  purple: {
    name: 'purple',
    colors: {
      background: '#f8f0ff',
      primary: '#000000',
      secondary: '#f0e6ff',
      accent: '#333333',
      text: '#000000',
      textSecondary: '#666666',
      border: '#000000'
    }
  },
  orange: {
    name: 'orange',
    colors: {
      background: '#fff8f0',
      primary: '#000000',
      secondary: '#ffe6cc',
      accent: '#333333',
      text: '#000000',
      textSecondary: '#666666',
      border: '#000000'
    }
  },
  pink: {
    name: 'pink',
    colors: {
      background: '#fff0f8',
      primary: '#000000',
      secondary: '#ffe6f3',
      accent: '#333333',
      text: '#000000',
      textSecondary: '#666666',
      border: '#000000'
    }
  }
}

const THEME_OPTIONS = [
  { value: '', label: 'Default', background: '#ffffff' },
  { value: 'blue', label: 'Blue', background: '#f0f8ff' },
  { value: 'red', label: 'Red', background: '#fff0f0' },
  { value: 'green', label: 'Green', background: '#f0fff0' },
  { value: 'yellow', label: 'Yellow', background: '#fffef0' },
  { value: 'purple', label: 'Purple', background: '#f8f0ff' },
  { value: 'orange', label: 'Orange', background: '#fff8f0' },
  { value: 'pink', label: 'Pink', background: '#fff0f8' }
]

export default function ThemeSelector({ value, onChange }) {
  const handleThemeChange = (themeValue) => {
    if (themeValue === '') {
      onChange(null)
    } else {
      onChange(THEMES[themeValue])
    }
  }

  return (
    <div className={styles.themeSelector}>
      <div className={styles.themeLabel}>Give it a Hue</div>
      <div className={styles.themeOptions}>
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${styles.themeOption} ${(!value && option.value === '') || (value?.name === option.value) ? styles.themeOptionActive : ''}`}
            onClick={() => handleThemeChange(option.value)}
            style={{ background: option.background, border: '1px solid #000' }}
            title={option.label}
          >
            <div className={styles.themeOptionName}>{option.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

