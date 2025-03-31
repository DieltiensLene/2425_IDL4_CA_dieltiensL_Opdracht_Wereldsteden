import './styles/reset.css';
import './styles/style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { apiKey } from './secret.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// 🌍 Steden met coördinaten en namen
const cities = {
  Paris: { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  Tokyo: { name: 'Tokyo', lat: 35.682839, lon: 139.759455 },
  'Rio de Janeiro': { name: 'Rio de Janeiro', lat: -22.9083, lon: -43.1964 },
  Honolulu: { name: 'Honolulu', lat: 21.3069, lon: -157.8583 },
  Cairo: { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
};

const fontLoader = new FontLoader();
fontLoader.load(
  'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
  (font) => {
    // 🌍 Functie om het weer op te halen en in de slider en globe te zetten
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

        // ✅ Toegevoegd: Label tonen op de wereldbol
        const label = new THREE.Mesh(
          new TextGeometry(`${city}: ${temp}°C`, {
            font: font,
            size: 0.2,
            height: 0.01,
            bevelEnabled: false, // Zorgt dat er geen extra diepte is
          }),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        label.position.set(
          pin.position.x + 0.2,
          pin.position.y,
          pin.position.z
        );
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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1;
    controls.enablePan = false;
    controls.enableZoom = false;

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('images/wereldkaart.jpg');
    const earthGeometry = new THREE.SphereGeometry(2, 50, 50);
    const earthMaterial = new THREE.MeshBasicMaterial({ map: earthTexture });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);

    function latLonToVector3(lat, lon, radius) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }

    const cityPins = [];
    Object.values(cities).forEach(({ name, lat, lon }) => {
      const cityGeometry = new THREE.SphereGeometry(0.05, 16, 16);
      const cityMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const cityMesh = new THREE.Mesh(cityGeometry, cityMaterial);
      const position = latLonToVector3(lat, lon, 2.05);
      cityMesh.position.copy(position);
      cityMesh.lookAt(new THREE.Vector3(0, 0, 0));
      scene.add(cityMesh);

      const tempElement = document.createElement('div');
      const iconElement = document.createElement('div');
      fetchWeather(name, tempElement, iconElement, cityMesh);
      cityPins.push(cityMesh);
    });

    camera.position.z = 5;

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  }
);
