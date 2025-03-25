import './styles/reset.css';
import './styles/style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { apiKey } from './secret.js';

// 🌍 Steden met coördinaten en namen
const cities = {
  Paris: { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  Tokyo: { name: 'Tokyo', lat: 35.682839, lon: 139.759455 },
  'Rio de Janeiro': { name: 'Rio de Janeiro', lat: -22.9083, lon: -43.1964 },
  Honolulu: { name: 'Honolulu', lat: 21.3069, lon: -157.8583 },
  Cairo: { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
};

// 🌡️ Functie om het weer op te halen en in de slider te zetten
async function fetchWeather(city, element, iconElement, pin) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const temp = Math.round(data.main.temp);
    const iconCode = data.weather[0].icon;
    const iconUrl = `http://openweathermap.org/img/wn/${iconCode}.png`;

    element.innerHTML = `${temp}°C`;
    iconElement.innerHTML = `<img src="${iconUrl}" alt="Weather icon" />`;

    // Zet de temperatuur als tekst bij de pin
    const label = new THREE.Mesh(
      new THREE.TextGeometry(`${city}: ${temp}°C`, {
        font: new THREE.FontLoader().parse(/* hier kun je een font bestand toevoegen */),
        size: 0.1,
        height: 0.01,
      }),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    label.position.set(pin.position.x + 0.2, pin.position.y, pin.position.z);
    scene.add(label);
  } catch (error) {
    console.error(`Fout bij ophalen van weer voor ${city}:`, error);
    element.textContent = 'Niet beschikbaar';
  }
}

// 🌍 Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 🌍 OrbitControls toevoegen
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Soepele beweging
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 1;
controls.minPolarAngle = 0; // Laat toe om volledig naar boven te kijken
controls.maxPolarAngle = Math.PI; // Laat toe om volledig naar beneden te kijken
controls.enablePan = false; // Geen zijwaarts schuiven
controls.enableZoom = false; // Zet inzoomen uit

// 🌍 Wereldbol maken
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('images/wereldkaart.jpg');
const earthGeometry = new THREE.SphereGeometry(2, 50, 50);
const earthMaterial = new THREE.MeshBasicMaterial({ map: earthTexture });
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earthMesh);

// 🌍 Coördinaten omzetten naar 3D
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// 🏙️ Steden als rode stippen toevoegen en fetchWeather aanroepen
const cityPins = [];
Object.values(cities).forEach(({ name, lat, lon }) => {
  const cityGeometry = new THREE.SphereGeometry(0.05, 16, 16);
  const cityMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const cityMesh = new THREE.Mesh(cityGeometry, cityMaterial);

  const position = latLonToVector3(lat, lon, 2.05);
  cityMesh.position.copy(position);
  cityMesh.lookAt(new THREE.Vector3(0, 0, 0));
  scene.add(cityMesh);

  // Haal het weer op voor de stad en zet de temperatuur
  const tempElement = document.createElement('div');
  const iconElement = document.createElement('div');
  fetchWeather(name, tempElement, iconElement, cityMesh);

  // Bewaar de stadspinnen voor later bijwerken
  cityPins.push(cityMesh);
});

// 🎥 Camera positie
camera.position.z = 5;

// 🚀 Variabele om te checken of de gebruiker sleept
let isUserInteracting = false;

// 👆 Event Listeners voor muisinteractie
controls.addEventListener('start', () => {
  isUserInteracting = true;
});
controls.addEventListener('end', () => {
  isUserInteracting = false;
});

// 🎡 Animatie zonder automatische rotatie
function animate() {
  requestAnimationFrame(animate);

  // 🌍 Verwijder de automatische rotatie van de wereldbol
  // Geen rotatie zonder muisinteractie

  // Zorg ervoor dat de stadspinnen meedraaien
  cityPins.forEach((cityPin) => {
    cityPin.rotation.y = earthMesh.rotation.y;
  });

  controls.update(); // Laat OrbitControls updaten
  renderer.render(scene, camera);
}
animate();

// 🎡 Swiper initialiseren
new Swiper('.swiper', {
  modules: [Navigation, Pagination],
  direction: 'horizontal',
  loop: true,
  pagination: {
    el: '.swiper-pagination',
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
});

// 🌡️ Weer ophalen voor de Swiper-slides
document.querySelectorAll('.swiper-slide').forEach((slide) => {
  const cityNameElement = slide.querySelector('.city-name');
  const tempElement = slide.querySelector('.temperature');
  const iconElement = slide.querySelector('.weather-icon');

  if (cityNameElement && tempElement && iconElement) {
    const city = cities[cityNameElement.textContent];
    if (city) {
      fetchWeather(city.name, tempElement, iconElement);
    }
  }
});

// 🎯 Resize event om canvas aan te passen bij venstergrootte
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
