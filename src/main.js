import './styles/reset.css';
import './styles/style.css';

// core version + navigation, pagination modules:
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
// import Swiper and modules styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// OpenWeather API key --> secret.js en secret.example.js file
import { apiKey } from './secret.js';

// Steden en hun corresponderende OpenWeatherMap namen
const cities = {
  "Paris": "Paris",
  "Tokyo": "Tokyo",
  "Rio de Janeiro": "Rio de Janeiro",
  "Honolulu": "Honolulu",
  "Cairo": "Cairo"
};

// Functie om het weer op te halen en in de slider te zetten
async function fetchWeather(city, element, iconElement) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const temp = data.main.temp;
    const iconCode = data.weather[0].icon;  // Haal de icon code op (bijv. '01d' voor zonnig)
    
    // Zet de temperatuur in de HTML
    element.innerHTML = `${temp}°C`;

    // Stel de URL van het icoon in en voeg het toe aan de pagina
    const iconUrl = `http://openweathermap.org/img/wn/${iconCode}.png`;
    iconElement.innerHTML = `<img src="${iconUrl}" alt="Weather icon" />`;
    
  } catch (error) {
    console.error(`Fout bij ophalen van weer voor ${city}:`, error);
    element.textContent = "Niet beschikbaar";
  }
}

// Itereer door alle slides en haal het weer op
document.querySelectorAll('.swiper-slide').forEach((slide) => {
  const cityNameElement = slide.querySelector('.city-name');
  const tempElement = slide.querySelector('.temperature');
  const iconElement = slide.querySelector('.weather-icon');  // Voeg een element toe voor het icoontje
  
  if (cityNameElement && tempElement && iconElement) {
    const city = cities[cityNameElement.textContent]; // Zoek de Engelse naam op
    if (city) {
      // Haal het weer op voor de stad en toon de temperatuur en het icoontje
      fetchWeather(city, tempElement, iconElement);
    }
  }
});

// Initieer Swiper
const swiper = new Swiper('.swiper', {
  modules: [Navigation, Pagination],
  direction: 'horizontal',
  loop: true,
  pagination: {
    el: '.swiper-pagination',
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  }
});
