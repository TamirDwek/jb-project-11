"use strict";

const CONFIG = {
  MAX_SELECTED_COINS: 5,
  CACHE_TIMEOUT: 2 * 60 * 1000,
  CHART_UPDATE_INTERVAL: 2000,
  CHART_MAX_POINTS: 10,
  COLORS: ["red", "blue", "green", "orange", "purple"],
  LOADING_HTML: `
    <div class="text-center p-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Loading coins...</p>
    </div>
  `,
  API_ENDPOINTS: {
    COINS_LIST: "https://api.coingecko.com/api/v3/coins/list",
    MARKETS: "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1",
    PRICES: "https://min-api.cryptocompare.com/data/pricemulti",
    COIN_INFO: (id) => `https://api.coingecko.com/api/v3/coins/${id}`
  }
};

const selectedCoins = new Set();
let chartInstance = null;

const saveToLocalStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
};

const getFromLocalStorage = (key) => {
  const item = localStorage.getItem(key);
  if (!item) return null;

  const { data, timestamp } = JSON.parse(item);
  if (Date.now() - timestamp > CONFIG.CACHE_TIMEOUT) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
};

const getData = (url) => fetch(url).then((response) => response.json());

const fetchCoins = async () => {
  const response = await fetch(CONFIG.API_ENDPOINTS.COINS_LIST);
  const coins = await response.json();
  return coins.slice(0, 100);
};

const fetchCoinsWithDetails = async () => {
  const response = await fetch(CONFIG.API_ENDPOINTS.MARKETS);
  return response.json();
};

const fetchPrices = async (coinIds) => {
  try {
    const symbols = coinIds.map(id => id.toUpperCase()).join(',');
    const response = await fetch(
      `${CONFIG.API_ENDPOINTS.PRICES}?fsyms=${symbols}&tsyms=USD`
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const prices = await response.json();
    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    return null;
  }
};

const drawChart = () => {
  const ctx = document.getElementById("reportsChart").getContext("2d");
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  const coinIds = Array.from(selectedCoins);
  const datasets = coinIds.map((coinId, index) => ({
    label: coinId.toUpperCase(),
    data: [],
    borderColor: [
      'rgb(255, 99, 132)',
      'rgb(54, 162, 235)',
      'rgb(75, 192, 192)',
      'rgb(255, 159, 64)',
      'rgb(153, 102, 255)'
    ][index],
    borderWidth: 2,
    tension: 0.4,
    fill: false
  }));

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        title: {
          display: true,
          text: 'Live Cryptocurrency Prices'
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Price (USD)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time'
          }
        }
      },
      animation: {
        duration: 750
      }
    }
  });

  const updateChart = async () => {
    try {
      const prices = await fetchPrices(coinIds);
      if (!prices) return;

      const currentTime = new Date().toLocaleTimeString();
      chartInstance.data.labels.push(currentTime);

      coinIds.forEach((coinId, index) => {
        const price = prices[coinId.toUpperCase()]?.USD;
        if (price !== undefined) {
          chartInstance.data.datasets[index].data.push(price);
        }
      });

      if (chartInstance.data.labels.length > CONFIG.CHART_MAX_POINTS) {
        chartInstance.data.labels.shift();
        chartInstance.data.datasets.forEach(dataset => {
          dataset.data.shift();
        });
      }

      chartInstance.update('active');
    } catch (error) {
      console.error('Error updating chart:', error);
    }
  };

  updateChart();

  const intervalId = setInterval(updateChart, CONFIG.CHART_UPDATE_INTERVAL);

  return () => {
    clearInterval(intervalId);
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  };
};

const renderCards = async () => {
  const cardsContainer = document.getElementById("cryptoCards");

  if (!cardsContainer) {
    console.error("Element with ID 'cryptoCards' not found.");
    return;
  }

  cardsContainer.innerHTML = CONFIG.LOADING_HTML;
  const cachedCoins = getFromLocalStorage("coins");
  const coins = cachedCoins || await fetchCoinsWithDetails();

  if (!cachedCoins) {
    saveToLocalStorage("coins", coins);
  }

  cardsContainer.innerHTML = coins
    .map(
      (coin) => `
      <div class="card coin-card text-black bg-light mb-3" style="max-width: 18rem;">
        <div class="card-header text-center">
          <img src="${coin.image}" alt="${coin.name}" class="img-fluid mb-3" onerror="this.src='default-image-url.jpg';">
          <div class="form-check form-switch mt-2">
            <input 
              class="form-check-input coin-switch" 
              name="${coin.id}" 
              type="checkbox" 
              data-coin-id="${coin.id}" 
              data-coin-symbol="${coin.symbol}" 
              data-coin-name="${coin.name}" 
              role="switch"
            >
          </div>
        </div>
        <div class="card-body">
          <h5 class="card-title">${coin.name}</h5>
          <p class="card-text">Symbol: ${coin.symbol}</p>
          <button class="btn btn-primary" onclick="loadMoreInfo(event, '${coin.id}')">More Info</button>
        </div>
      </div>
    `
    )
    .join("");

  setupSwitchListeners();
};

const setupSwitchListeners = () => {
  document.querySelectorAll(".coin-switch").forEach((switchEl) => {
    switchEl.addEventListener("change", (e) => {
      const coinId = e.target.dataset.coinId;
      const coinSymbol = e.target.dataset.coinSymbol;

      if (e.target.checked) {
        if (selectedCoins.size >= CONFIG.MAX_SELECTED_COINS) {
          alert(
            "You can only select up to 5 coins. Please deselect one to choose another."
          );
          e.target.checked = false;
          return;
        }
        selectedCoins.add(coinId);
      } else {
        selectedCoins.delete(coinId);
      }

      updateReports();
    });
  });
};

const updateReports = () => {
  const reportsContainer = document.getElementById("reportsContent");
  if (!reportsContainer) return;

  reportsContainer.innerHTML = `
    <div class="chart-container" style="position: relative; height:60vh; width:80vw; margin: auto;">
      <canvas id="reportsChart"></canvas>
    </div>
  `;

  if (selectedCoins.size > 0) {
    drawChart();
  } else {
    reportsContainer.innerHTML = `
      <div class="alert alert-warning">
        Please select at least one coin to view the report.
      </div>
    `;
  }
};

window.loadMoreInfo = async (event, coinId) => {
  try {
    const coin = await getData(CONFIG.API_ENDPOINTS.COIN_INFO(coinId));

    if (!coin || !coin.market_data) {
      throw new Error("Invalid coin data received");
    }

    const popoverContent = `
      <div>
        <strong>${coin.name} (${coin.symbol.toUpperCase()})</strong>
        <br><br>
        <p><strong>Market Cap Rank:</strong> ${coin.market_cap_rank}</p>
        <p><strong>Price (USD):</strong> ${coin.market_data.current_price.usd}$</p>
        <p><strong>Price (EUR):</strong> ${coin.market_data.current_price.eur}€</p>
        <p><strong>Price (ILS):</strong> ${coin.market_data.current_price.ils}₪</p>
        <p><strong>Homepage:</strong> <a href="${coin.links.homepage[0]}" target="_blank">${coin.links.homepage[0]}</a></p>
      </div>
    `;

    const popoverTriggerEl = event.target;
    popoverTriggerEl.setAttribute("data-bs-content", popoverContent);

    if (!popoverTriggerEl._popover) {
      const popover = new bootstrap.Popover(popoverTriggerEl, {
        placement: "right",
        trigger: "click",
        html: true,
      });
      popover.show();

      popoverTriggerEl._popover = popover;
      popoverTriggerEl.innerHTML = "Close Window";

      popoverTriggerEl.addEventListener("click", () => {
        popoverTriggerEl._popover.hide();
        popoverTriggerEl.innerHTML = "More Info";
      }, { once: true });
    } else {
      popoverTriggerEl._popover.show();
    }
  } catch (error) {
    console.error("Error loading coin info:", error);
    alert("Sorry, there was an error fetching the coin's data.");
  }
};

const setupSearch = () => {
  document.getElementById("buttonInput").addEventListener("click", async () => {
    const query = document.getElementById("inputSearchBar").value.trim().toLowerCase();
    if (!query) return alert("Please enter a coin name.");

    const cardsContainer = document.getElementById("cryptoCards");
    cardsContainer.innerHTML = CONFIG.LOADING_HTML;

    const cachedCoins = getFromLocalStorage("coins");
    const coins = cachedCoins || await fetchCoinsWithDetails();

    const filteredCoins = coins.filter(
      (coin) =>
        coin.name.toLowerCase().includes(query) ||
        coin.symbol.toLowerCase().includes(query)
    );

    if (filteredCoins.length === 0) {
      alert("No matching coins found.");
      return;
    }

    cardsContainer.innerHTML = filteredCoins
      .map(coin => `
        <div class="card coin-card text-black bg-light mb-3" style="max-width: 18rem;">
          <div class="card-header">
            <img src="${coin.image}" alt="${coin.name}" class="img-fluid mb-3" onerror="this.src='default-image-url.jpg';">
            <div class="form-check form-switch">
              <input 
                class="form-check-input coin-switch" 
                name="${coin.id}" 
                type="checkbox" 
                data-coin-id="${coin.id}" 
                data-coin-symbol="${coin.symbol}" 
                data-coin-name="${coin.name}" 
                role="switch"
              >
            </div>
          </div>
          <div class="card-body">
            <h5 class="card-title">${coin.name}</h5>
            <p class="card-text">Symbol: ${coin.symbol}</p>
            <button class="btn btn-primary" onclick="loadMoreInfo(event, '${coin.id}')">More Info</button>
          </div>
        </div>
      `)
      .join("");
    
    setupSwitchListeners();
  });
};

const switchTab = (tabId) => {
  const sections = {
    pali: document.getElementById("paliContent"),
    coins: document.getElementById("cryptoCards").parentElement,
    reports: document.getElementById("reportsContent"),
    about: document.getElementById("aboutContent"),
  };

  Object.keys(sections).forEach((key) => {
    if (sections[key]) {
      sections[key].style.display = key === tabId ? "block" : "none";
    }
  });

  document.querySelectorAll("nav .btn").forEach((btn) => {
    btn.classList.toggle("active", btn.id === `${tabId}-tab`);
  });
};

// Event Listeners Setup
document.addEventListener("DOMContentLoaded", async () => {
  await renderCards();
  setupSearch();

  // Initialize popovers
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  popoverTriggerList.map((popoverTriggerEl) => new bootstrap.Popover(popoverTriggerEl));

  // Tab event listeners
  document.getElementById("home-tab")?.addEventListener("click", async () => {
    await renderCards();
    switchTab("coins");
  });

  document.getElementById("reports-tab")?.addEventListener("click", () => {
    switchTab("reports");
    if (selectedCoins.size > 0) {
      updateReports();
    } else {
      document.getElementById("reportsContent").innerHTML = 
        '<div class="alert alert-warning">Please select at least one coin to view the report.</div>';
    }
  });

  document.getElementById("about-tab")?.addEventListener("click", () => switchTab("about"));
  document.getElementById("pali-tab")?.addEventListener("click", () => switchTab("pali"));

  // Set default tab
  switchTab("coins");
});