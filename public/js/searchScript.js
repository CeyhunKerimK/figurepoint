document.addEventListener('DOMContentLoaded', function() {
    const sidebarSearch = document.getElementById('dynamicSearch');
    const topSearch = document.getElementById('dynamicSearchTop');
    const searchResultsContainer = document.getElementById('searchResults');
  
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  
    async function performSearch(searchTerm) {
      if (searchTerm.length < 2) {
        searchResultsContainer.innerHTML = '';
        return;
      }
  
      try {
        const response = await fetch(`/product/search?term=${encodeURIComponent(searchTerm)}`);
        const products = await response.json();
  
        if (products.length === 0) {
          searchResultsContainer.innerHTML = '<p>Ürün bulunamadı.</p>';
          return;
        }
  
        const html = products.map(product => `
          <div class="product-item">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p>Fiyat: ${product.price} TL</p>
            <p>Kategori: ${product.category_name}</p>
          </div>
        `).join('');
  
        searchResultsContainer.innerHTML = html;
      } catch (error) {
        console.error('Arama hatası:', error);
        searchResultsContainer.innerHTML = '<p>Arama sırasında bir hata oluştu.</p>';
      }
    }
  
    const debouncedSearch = debounce(performSearch, 300);
  
    sidebarSearch.addEventListener('input', function() {
      debouncedSearch(this.value);
    });
  
    topSearch.addEventListener('input', function() {
      debouncedSearch(this.value);
    });
  });