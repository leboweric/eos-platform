from PIL import Image
import numpy as np

# Open the image
img = Image.open('/Users/ericlebow/Library/CloudStorage/OneDrive-PBN/Software Projects/eos-platform/Davis_Logo.png')
img = img.convert('RGBA')

# Convert to numpy array
data = np.array(img)

# Create a copy for modification
new_data = data.copy()

# Define the blue color (you can adjust this RGB value)
# Using a nice corporate blue similar to your theme
blue_color = (59, 130, 246)  # This is approximately #3B82F6

# Process each pixel
for y in range(data.shape[0]):
    for x in range(data.shape[1]):
        r, g, b, a = data[y, x]
        
        # Check if the pixel is white or near-white (the text)
        # White pixels have high R, G, B values
        if r > 200 and g > 200 and b > 200 and a > 0:
            # Change white to blue, preserving alpha
            new_data[y, x] = (blue_color[0], blue_color[1], blue_color[2], a)

# Convert back to image
new_img = Image.fromarray(new_data, 'RGBA')

# Save the new image
new_img.save('/Users/ericlebow/Library/CloudStorage/OneDrive-PBN/Software Projects/eos-platform/Davis_Logo_Blue.png')

print("Logo converted successfully! Saved as Davis_Logo_Blue.png")