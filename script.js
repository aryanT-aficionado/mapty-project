`use strict`;

class Workout {
  date = new Date();
  // id = (Date.now() + ``).slice(-10);
  id = Math.random().toString(9).slice(10);
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date=...;
    // this.id=...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; //in mins
  }

  _setDescription() {
    // prettier-ignore
    const months = [
  `January`,`February`,`March`,`April`,`May`,`June`,`July`,`August`,
  `September`,`October`,`November`,`December`,
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = `running`;
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    // this.type=`running`

    this._setDescription();
  }

  calcPace() {
    // mins/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = `cycling`;

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    // this.type=`cycling`

    this._setDescription();
  }

  calcSpeed() {
    // km/hr

    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 27, 96, 588);
// console.log(run1, cycle1);

///////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector(`.form`);
const containerWorkouts = document.querySelector(`.workouts`);
const inputType = document.querySelector(`.form__input--type`);
const inputDistance = document.querySelector(`.form__input--distance`);
const inputDuration = document.querySelector(`.form__input--duration`);
const inputCadence = document.querySelector(`.form__input--cadence`);
const inputElevation = document.querySelector(`.form__input--elevation`);

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get User Position
    this._getPosition();

    // Get Data from local storage
    this._getLocalStorage();

    // Attach Event Handlers
    form.addEventListener(`submit`, this._newWorkOut.bind(this));

    inputType.addEventListener(`change`, this._toggleElevationField);

    containerWorkouts.addEventListener(`click`, this._moveToPopup.bind(this));
  }

  _getPosition() {
    // Geolocation API
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // console.log(this);
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);
    // console.log(map);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on Map
    this.#map.on(`click`, this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove(`hidden`);
    inputDistance.focus();
  }

  _hideForm() {
    // Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        ``;

    form.style.display = `none`;
    form.classList.add(`hidden`);
    setTimeout(() => {
      form.style.display = `grid`;
    }, 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
  }

  _newWorkOut(e) {
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    // Get data from from
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let workout;

    // if activity runningg, create running object
    if (type === `running`) {
      const cadence = +inputCadence.value;

      // check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        console.log(distance, duration, cadence);
        return alert(`Input invalid`);
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if activity cycling, create cycling object
    if (type === `cycling`) {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        console.log(distance, duration, elevation);
        return alert(`Input invalid`);
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to the workout array

    this.#workouts.push(workout);
    // console.log(workout);

    // Render workout on map as a marker

    this._renderWorkoutMarker(workout);

    // Render workout on the list
    this._renderWorkout(workout);

    // Hide the form and clear input
    this._hideForm();

    // Set Local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workedout) {
    L.marker(workedout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workedout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workedout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workedout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workinOut) {
    let html = `
      <li class="workout workout--${workinOut.type}" data-id="${workinOut.id}">
          <h2 class="workout__title">${workinOut.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workinOut.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workinOut.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workinOut.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workinOut.type === `running`)
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workinOut.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workinOut.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
      </li>`;

    if (workinOut.type === `cycling`)
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workinOut.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workinOut.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
      </li> `;

    form.insertAdjacentHTML(`afterend`, html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(`.workout`);
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workoutin = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    // console.log(workoutin);

    this.#map.setView(workoutin.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // Using the public interface

    // workoutin.click();  //Used for counting the clips
  }

  _setLocalStorage() {
    localStorage.setItem(`workouts`, JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem(`workouts`));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem(`workouts`);
    location.reload();
  }
}

const app = new App();
// app._loadMap();
