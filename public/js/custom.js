document.querySelectorAll('.card-img-wrapper').forEach(wrapper => {
    wrapper.addEventListener('click', function() {
      const imgSrc = this.querySelector('img').src;
      document.getElementById('modalImage').src = imgSrc;
      new bootstrap.Modal(document.getElementById('imageModal')).show();
    });
  });