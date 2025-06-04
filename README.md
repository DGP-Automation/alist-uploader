# alist-uploader

This action uploads files to an AList instance.

# Usage

```yaml
- uses: DGP-Automation/alist-uploader@v1
  with:
    # The path to the file you want to upload
    file_path: 'path/to/your/file.txt'
    
    # The target path in AList where the file will be uploaded
    target_path: '/path/in/alist/'
    
    # Optional: Set to true to overwrite existing files at the target path, default is true
    overwrite: true
    
    # The host of your AList instance. Optional if environment variable ALIST_HOST is set
    host: 'hostname.com'
    
    # The username of your AList account. Optional if environment variable ALIST_USERNAME is set
    username: 'your_username'
    
    # The password of your AList account. Optional if environment variable ALIST_PASSWORD is set
    password: 'your_password'
```

