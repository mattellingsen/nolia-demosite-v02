# Image Management Guidelines

This folder contains all static images for the Nolia website project.

## Folder Structure

```
public/images/
├── hero/          # Hero section images
├── patterns/      # Background patterns and textures
├── logos/         # Company logos and brand assets
├── icons/         # Custom icons and UI elements
├── products/      # Product-related imagery
└── general/       # General purpose images
```

## Image Guidelines

### File Naming
- Use kebab-case: `geo-shapes-desktop-03.svg`
- Include viewport suffixes: `-desktop`, `-tablet`, `-mobile`
- Be descriptive: `procurement-dashboard-screenshot.png`

### File Formats
- **SVGs**: For icons, logos, and simple graphics
- **PNG**: For screenshots and images with transparency
- **WebP**: For photos and complex images (with PNG fallback)
- **JPG**: For photos when WebP isn't supported

### Responsive Images
Always provide variants for different screen sizes:
- Desktop: Full resolution
- Tablet: Medium resolution  
- Mobile: Optimized for small screens

### Optimization
- Compress all images before adding to repository
- Use appropriate quality settings
- Consider lazy loading for non-critical images

## Usage
Reference images from components using relative paths:
```jsx
src="/images/hero/geo-shapes-desktop-03.svg"
```

## Replacing External Images
When replacing external images (like untitledui.com references):
1. Download the original image
2. Place in appropriate subfolder
3. Update component to use local path
4. Test all responsive variants
5. Remove external dependency