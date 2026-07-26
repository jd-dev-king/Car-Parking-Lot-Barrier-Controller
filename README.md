# EES 3D Parking PLC Simulator

A fully browser-based programmable logic controller simulation and 3D parking-lot digital twin developed for the EES Universe.

The application recreates the original OpenPLC parking-barrier logic as an interactive web experience. It combines a continuous JavaScript PLC scan cycle, CTUD-style occupancy control, a holographic HMI, interactive Function Block Diagram and ladder views, and a Three.js-powered parking lot with ten spaces, animated vehicles, and separate entrance and exit barriers.

No external PLC runtime, HMI application, virtual machine, database, or backend server is required.

## Live Project

GitHub Pages:

https://jd-dev-king.github.io/Car-Parking-Lot-Barrier-Controller/

Repository:

https://github.com/jd-dev-king/Car-Parking-Lot-Barrier-Controller

## Project Overview

The simulator models a ten-space parking facility controlled by a browser-based virtual PLC.

The PLC continuously scans its inputs, executes the parking-control logic, updates the occupancy counter and safety interlocks, writes its outputs, and refreshes the HMI and 3D digital twin.

The simulator supports two operating modes:

### Manual Mode

Manual mode is active when the application starts.

Users control the simulation through HMI commands:

```text
Entry_HMI
Exit_HMI
Reset_HMI
```

The Request Entry and Request Exit buttons generate HMI pulses that operate the corresponding gates and vehicle animations.

### Automatic Mode

Auto mode generates simulated parking sensor pulses without requiring repeated button clicks.

The automatic sequence:

1. Generates one `Entry_Sensor` pulse.
2. Opens the entrance barrier.
3. Animates a vehicle into an available parking space.
4. Increments the CTUD-style parking counter.
5. Waits for the complete gate and vehicle sequence.
6. Repeats until all ten parking spaces are occupied.
7. Changes direction when the lot becomes full.
8. Generates one `Exit_Sensor` pulse at a time.
9. Removes vehicles until the parking lot becomes empty.
10. Repeats the fill-and-drain cycle.

The mode toggle remains available during vehicle animations, allowing users to switch between Manual and Auto mode without timing the button press between sequences.

## Version 2.0.3 Features

* Fully browser-based virtual PLC
* Continuous 100-millisecond PLC scan cycle
* Manual HMI operating mode
* Automatic sensor-pulse operating mode
* Mode switching during active vehicle animations
* CTUD-style up/down parking counter
* Ten simulated parking spaces
* Animated entrance barrier
* Animated exit barrier
* Animated vehicle entry sequences
* Animated vehicle exit sequences
* Full-lot entry interlock
* Empty-lot exit interlock
* Emergency-stop function
* Holographic occupancy display
* Available-space indicator
* Lot-full status
* Lot-empty status
* Interactive FBD signal-flow view
* Interactive ladder-logic view
* Live PLC tag monitoring
* PLC event and alarm log
* Three.js 3D parking digital twin
* Responsive single-window interface
* GitHub Pages deployment support
* Vercel deployment support

## Virtual PLC Scan Cycle

The JavaScript PLC engine runs continuously in the browser.

```text
Read Inputs
     ↓
Execute PLC Logic
     ↓
Evaluate Rising Edges
     ↓
Update CTUD Counter
     ↓
Apply Capacity Interlocks
     ↓
Write Outputs
     ↓
Update HMI and 3D Digital Twin
```

The default scan rate is:

```text
100 milliseconds
```

The HMI displays the total number of completed scans while the simulator is running.

## PLC Logic

The browser implementation follows the same control concept as the original OpenPLC Function Block Diagram.

### Entry Request

```text
Entry_Request = Entry_Sensor OR Entry_HMI
```

### Exit Request

```text
Exit_Request = Exit_Sensor OR Exit_HMI
```

### Reset Request

```text
Reset_Request = Reset_Count OR Reset_HMI
```

### Entrance Barrier

```text
Barrier_Open =
Entry_Request
AND NOT Lot_Full
AND NOT Emergency_Stop
```

### Exit Barrier

```text
Exit_Barrier =
Exit_Request
AND NOT Lot_Empty
AND NOT Emergency_Stop
```

## CTUD-Style Counter

The virtual PLC uses rising-edge detection to reproduce CTUD behavior.

```text
CU = Rising edge of Entry_Request
CD = Rising edge of Exit_Request
R  = Rising edge of Reset_Request
PV = Max_Capacity
CV = Car_Count
QU = Lot_Full
QD = Lot_Empty
```

The preset capacity is:

```text
Max_Capacity = 10
```

The counter is prevented from increasing above ten or decreasing below zero.

## Operating Sequence

### Entry Sequence

1. An entry request is generated.
2. The PLC checks the emergency-stop state.
3. The PLC checks the full-lot interlock.
4. The entrance gate opens.
5. A vehicle enters the parking lot.
6. The vehicle moves to the next available parking space.
7. The selected parking space changes to occupied.
8. The parking counter increments.
9. The entrance gate closes.
10. The HMI and live tags update.

### Exit Sequence

1. An exit request is generated.
2. The PLC checks the emergency-stop state.
3. The PLC checks the empty-lot interlock.
4. The exit gate opens.
5. The most recently parked vehicle leaves its space.
6. The vehicle travels through the exit lane.
7. The parking space returns to available.
8. The parking counter decrements.
9. The exit gate closes.
10. The HMI and live tags update.

## Holographic HMI

The operator interface displays:

* Current parking occupancy
* Maximum parking capacity
* Remaining parking spaces
* Lot-empty status
* Lot-full status
* Current operating mode
* Entrance-gate status
* Exit-gate status
* PLC scan rate
* Total scan count
* Emergency-stop status
* Current sequence state

## HMI Controls

### Request Entry

Manual mode:

```text
Pulses Entry_HMI
```

Auto mode:

```text
Entry requests are generated automatically through Entry_Sensor
```

### Request Exit

Manual mode:

```text
Pulses Exit_HMI
```

Auto mode:

```text
Exit requests are generated automatically through Exit_Sensor
```

### Toggle Mode

Switches between:

```text
MANUAL
AUTO
```

The toggle remains available while a gate or vehicle animation is running.

### Reset Count

Returns occupancy to zero and clears all displayed parked vehicles.

### Emergency Stop

Immediately inhibits:

```text
Barrier_Open
Exit_Barrier
Entry requests
Exit requests
```

Releasing the emergency stop restores normal operation without changing the selected operating mode.

## Interactive Logic Views

### Function Block Diagram View

The FBD panel displays:

* Entry sensor request
* Exit sensor request
* OR request blocks
* CTUD counter state
* Counter inputs and outputs
* Full-lot status
* Empty-lot status
* Entry interlock
* Entrance-barrier output
* Active signal highlighting

### Ladder View

The ladder-style panel displays:

* Entry request contact
* Normally closed lot-full contact
* Entrance-barrier output coil
* Exit request contact
* Exit-barrier output coil
* CTUD current and preset values

## Live PLC Tags

The diagnostics panel monitors:

| Tag               | Type | Purpose                            |
| ----------------- | ---: | ---------------------------------- |
| `Entry_Sensor`    | BOOL | Automatic entrance sensor pulse    |
| `Exit_Sensor`     | BOOL | Automatic exit sensor pulse        |
| `Entry_HMI`       | BOOL | Manual HMI entrance request        |
| `Exit_HMI`        | BOOL | Manual HMI exit request            |
| `Reset_Count`     | BOOL | Automatic reset input              |
| `Reset_HMI`       | BOOL | Manual reset command               |
| `Entry_Request`   | BOOL | Combined entry request             |
| `Exit_Request`    | BOOL | Combined exit request              |
| `Barrier_Open`    | BOOL | Entrance barrier output            |
| `Exit_Barrier`    | BOOL | Exit barrier output                |
| `Lot_Full`        | BOOL | Maximum capacity reached           |
| `Lot_Empty`       | BOOL | Parking count equals zero          |
| `Car_Count`       |  INT | Current parking occupancy          |
| `Max_Capacity`    |  INT | Maximum number of parking spaces   |
| `Spots_Remaining` |  INT | Number of available parking spaces |

## PLC Event Log

The event buffer records:

* Simulator startup
* Mode changes
* Entry requests
* Exit requests
* Accepted sequences
* Blocked entry requests
* Blocked exit requests
* Occupancy changes
* Counter resets
* Emergency-stop activation
* Emergency-stop release
* Automatic fill and drain direction changes

## 3D Parking Digital Twin

The Three.js viewport includes:

* Ten marked parking spaces
* Two rows of five spaces
* Entrance travel lane
* Exit travel lane
* Animated entrance barrier
* Animated exit barrier
* Individual vehicle models
* Unique vehicle colors
* Parking-space occupancy lighting
* Perimeter lighting
* Holographic EES parking sign
* Overview camera
* Entrance-gate camera
* Exit-gate camera
* Orbit and zoom controls

## Technologies Used

* HTML5
* CSS3
* JavaScript ES modules
* Three.js
* WebGL
* OrbitControls
* Virtual PLC scan-cycle architecture
* IEC 61131-3 concepts
* Function Block Diagram concepts
* Ladder-logic concepts
* CTUD counter logic
* Visual Studio Code
* Git
* GitHub
* GitHub Pages
* Vercel

## Project Structure

```text
ees_3d_parking_plc_simulator/
├── index.html
├── style.css
├── app.js
├── README.md
├── vercel.json
├── LICENSE
└── .gitignore
```

## Run Locally

The project uses JavaScript modules and should be opened through a local development server.

### Visual Studio Code Live Server

1. Open the project folder in Visual Studio Code.
2. Right-click `index.html`.
3. Select **Open with Live Server**.

### Python Local Server

From the project directory:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## GitHub Pages Deployment

This repository is published at:

https://jd-dev-king.github.io/Car-Parking-Lot-Barrier-Controller/

GitHub Pages can be configured using:

```text
Settings
→ Pages
→ Deploy from a branch
→ main
→ root
```

If the simulator files are placed inside a `docs` folder instead, select:

```text
main
/docs
```

## Vercel Deployment

The project is fully static and requires no backend or database.

To deploy:

1. Sign in to Vercel.
2. Import the GitHub repository.
3. Select the repository.
4. Leave the framework preset as Other.
5. Leave the build command empty.
6. Leave the output directory empty or set it to the folder containing `index.html`.
7. Deploy.

The included `vercel.json` supplies static-site headers and routing settings.

## Version History

### Version 1.0.0 — OpenPLC Logic and Simulation

* OpenPLC Function Block Diagram
* CTUD occupancy counter
* Entry and exit sensor simulation
* HMI input simulation
* Full-lot interlock
* Empty-lot detection
* Debugger validation
* GitHub Pages case study

### Version 2.0.0 — Browser PLC and 3D Digital Twin

* JavaScript virtual PLC
* Three.js parking lot
* Interactive HMI
* FBD view
* Ladder view
* Animated barriers and vehicles

### Version 2.0.1 — Mode Interface Update

* Improved Auto and Manual mode display
* Updated input-source labels
* Separate HMI and sensor tag feedback

### Version 2.0.2 — Automatic Pulse Cycle

* Added autonomous Auto mode
* Added automatic fill-and-drain operation
* Added timed entry and exit sensor pulses

### Version 2.0.3 — Control Stability Update

* Manual mode is now the default startup mode
* Mode toggle remains available during animations
* Switching modes no longer resets occupancy
* Automatic pulses are queued one at a time
* Each pulse waits for the previous vehicle sequence to complete
* Removed overlapping timer behavior
* Improved automatic fill-and-drain stability

## Future Improvements

* Automatic traffic arrival-rate controls
* Adjustable automatic pulse interval
* Random vehicle arrival simulation
* Entry and exit queue visualization
* Barrier safety photo-eye sensors
* Vehicle-presence sensors for each parking space
* TON and TOF timer simulation
* Gate fault injection
* Sensor fault injection
* Alarm acknowledgment
* Occupancy history chart
* Utilization analytics
* Energy monitoring
* Day and night environments
* Weather simulation
* Sound effects
* Saved simulation sessions
* Training challenges
* PLC programming exercises
* EES achievement badges

## Project Status

Version 2.0.3 is functional and ready for GitHub Pages and Vercel deployment.

The simulator starts in Manual mode and supports stable switching between Manual and Auto operation without resetting the current parking count.

## Author

**Jeremiah Lupton**

GitHub:

https://github.com/jd-dev-king

Project repository:

https://github.com/jd-dev-king/Car-Parking-Lot-Barrier-Controller

## License

This project is released under the MIT License.
