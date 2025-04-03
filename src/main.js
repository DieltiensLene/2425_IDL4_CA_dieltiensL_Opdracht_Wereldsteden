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

// 🌍 Steden met coördinaten en namen - ADJUSTED COORDINATES to match wereldkaart.png
const cities = {
  Paris: { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  Tokyo: { name: 'Tokyo', lat: 35.682839, lon: 139.759455 },
  'Rio de Janeiro': { name: 'Rio de Janeiro', lat: -22.9083, lon: -43.1964 },
  Honolulu: { name: 'Honolulu', lat: 21.3069, lon: -157.8583 },
  Cairo: { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
};

// Three.js setup
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

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 1;
controls.enablePan = false;
controls.enableZoom = false;

const textureLoader = new THREE.TextureLoader();
let earthMesh;

// Create a dummy mesh to detect when the texture is loaded
const earthTexture = textureLoader.load('images/wereldkaart.jpg', () => {
  // This callback is executed when the texture is loaded
  console.log('Earth texture loaded successfully');
  initializeCities();
});

const earthGeometry = new THREE.SphereGeometry(2, 50, 50);
const earthMaterial = new THREE.MeshBasicMaterial({ map: earthTexture });
earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earthMesh);

// Modified mapping function - fix texture alignment issues
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = lon * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Create a group to hold city pins and labels
const cityGroup = new THREE.Group();
scene.add(cityGroup);

// Create line objects to connect circles and labels
const cityPins = [];
const cityLabels = [];
const cityConnections = [];

// Create sprite material for labels
const createLabelSprite = (text) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 256;

  // Draw background
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text
  context.font = 'bold 44px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false, // Ensures labels are always visible regardless of depth
    depthWrite: false, // Ensures labels don't affect depth buffer
  });
  return new THREE.Sprite(material);
};

// Weather data cache
const weatherCache = {};

// Function to fetch weather data
async function fetchWeather(city, element, iconElement, labelSprite) {
  // Check if we already have this data cached
  if (weatherCache[city]) {
    updateElements(weatherCache[city], element, iconElement, labelSprite);
    return;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const temp = Math.round(data.main.temp);
    const iconCode = data.weather[0].icon;
    const iconUrl = `http://openweathermap.org/img/wn/${iconCode}.png`;

    // Cache the data
    weatherCache[city] = { temp, iconCode, iconUrl };

    // Update DOM and 3D elements
    updateElements(weatherCache[city], element, iconElement, labelSprite);
  } catch (error) {
    console.error(`Fout bij ophalen van weer voor ${city}:`, error);
    element.textContent = 'Niet beschikbaar';
  }
}

// Function to update both DOM elements and 3D label
function updateElements(data, element, iconElement, labelSprite) {
  // Update DOM elements
  element.innerHTML = `${data.temp}°C`;
  iconElement.innerHTML = `<img src="${data.iconUrl}" alt="Weather icon" />`;

  // Update 3D label if provided
  if (labelSprite) {
    // Update sprite texture with new temperature
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;

    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'bold 44px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      `${labelSprite.userData.city}: ${data.temp}°C`,
      canvas.width / 2,
      canvas.height / 2
    );

    const texture = new THREE.CanvasTexture(canvas);
    labelSprite.material.map = texture;
    labelSprite.material.needsUpdate = true;
  }
}

// Helper function to find DOM elements for each city
function findCityElements(cityName) {
  const slides = document.querySelectorAll('.swiper-slide');
  let tempElement, iconElement;

  slides.forEach((slide) => {
    const cityNameEl = slide.querySelector('.city-name');
    if (cityNameEl && cityNameEl.textContent === cityName) {
      tempElement = slide.querySelector('.temperature');
      iconElement = slide.querySelector('.weather-icon');
    }
  });

  return { tempElement, iconElement };
}

// Initialize city pins and labels - now in a separate function
function initializeCities() {
  // First, clear any existing markers
  while (cityGroup.children.length > 0) {
    cityGroup.remove(cityGroup.children[0]);
  }
  cityPins.length = 0;
  cityLabels.length = 0;
  cityConnections.length = 0;

  // Use correct initial rotation for the earth to match the map texture
  earthMesh.rotation.y = Math.PI; // Adjust this value as needed

  // Initialize city pins and labels
  Object.values(cities).forEach(({ name, lat, lon }) => {
    // Position on globe
    const globePosition = latLonToVector3(lat, lon, 2.05);

    // Create pin (red circle)
    const cityGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const cityMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      depthTest: false,
    });
    const cityMesh = new THREE.Mesh(cityGeometry, cityMaterial);
    cityMesh.position.copy(globePosition);
    cityGroup.add(cityMesh);
    cityPins.push(cityMesh);

    // Create label sprite
    const labelSprite = createLabelSprite(`${name}: Loading...`);
    labelSprite.userData = {
      city: name,
      globePosition: globePosition.clone(),
    };

    // Position label offset from the globe
    const direction = globePosition.clone().normalize();
    const labelPosition = globePosition
      .clone()
      .add(direction.multiplyScalar(0.7));
    labelSprite.position.copy(labelPosition);
    labelSprite.scale.set(1.0, 0.5, 1);
    cityGroup.add(labelSprite);
    cityLabels.push(labelSprite);

    // Create line connecting pin and label
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      depthTest: false,
    });

    // Start with basic points that will be updated in animation loop
    lineGeometry.setFromPoints([globePosition, labelPosition]);

    const line = new THREE.Line(lineGeometry, lineMaterial);
    cityGroup.add(line);
    cityConnections.push({
      line: line,
      pin: cityMesh,
      label: labelSprite,
    });

    // Find corresponding DOM elements
    const { tempElement, iconElement } = findCityElements(name);

    // Fetch weather data
    if (tempElement && iconElement) {
      fetchWeather(name, tempElement, iconElement, labelSprite);
    }
  });
}

function initializeSwiper() {
  new Swiper('.swiper', {
    modules: [Navigation, Pagination],
    direction: 'horizontal',
    loop: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    slidesPerView: 1,
    spaceBetween: 30,
    centeredSlides: true,
    on: {
      slideChange: function () {
        const index = this.realIndex; // Use realIndex to avoid loop offsets
        const cityName = Object.keys(cities)[index];

        if (cityName && cities[cityName]) {
          const city = cities[cityName];
          const position = latLonToVector3(city.lat, city.lon, 2.05);
          const targetPosition = position.clone().normalize().multiplyScalar(5);

          controls.target.set(0, 0, 0);
          camera.position.set(
            targetPosition.x,
            targetPosition.y,
            targetPosition.z
          );
          camera.lookAt(scene.position);
        }
      },
    },
  });

  console.log('Swiper initialized successfully');
}

camera.position.z = 5;

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateLabelPositions() {
  cityLabels.forEach((sprite, index) => {
    // Make all sprites visible
    sprite.visible = true;

    // Make sprite always face the camera
    sprite.lookAt(camera.position);

    // Update the line connecting the pin and label
    const connection = cityConnections[index];
    const pin = connection.pin;
    const label = connection.label;

    // Update line vertices
    const lineGeometry = connection.line.geometry;
    const positions = new Float32Array([
      pin.position.x,
      pin.position.y,
      pin.position.z,
      label.position.x,
      label.position.y,
      label.position.z,
    ]);
    lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    lineGeometry.attributes.position.needsUpdate = true;

    // Make sure pin and line are always visible too
    pin.visible = true;
    connection.line.visible = true;
  });
}

// Call this to enable adjustment UI (useful for development)
// Uncomment this line if you want to have controls for fine-tuning city positions
// addCityAdjustmentControls();

function animate() {
  requestAnimationFrame(animate);

  // Update controls
  controls.update();

  // Keep labels, pins, and connection lines visible and properly positioned
  updateLabelPositions();

  // Render the main scene
  renderer.render(scene, camera);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // If texture is already loaded by this point
  if (earthTexture.image && earthTexture.image.complete) {
    initializeCities();
  }

  // Initialize Swiper
  const swiper = initializeSwiper();
  console.log('Swiper instance:', swiper);

  // Start animation loop
  animate();
});
