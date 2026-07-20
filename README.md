# Car Parking Lot Barrier Controller

A simulated parking-lot barrier control system developed in OpenPLC using IEC 61131-3 Function Block Diagram logic.

The controller tracks vehicles entering and exiting the parking lot, monitors the current occupancy, prevents additional entry when maximum capacity is reached, and supports both simulated sensor inputs and future HMI commands.

## Project Overview

This project demonstrates a basic industrial automation control sequence for a parking-lot entrance barrier.

The system uses a CTUD up/down counter to maintain the current vehicle count. Entry requests increment the count, exit requests decrement it, and the entry barrier is only permitted to open when available parking capacity remains.

Version 1 focuses on the completed PLC logic, OpenPLC Online simulation, debugger validation, and GitHub Pages documentation.

## Version 1.0 Features

* IEC 61131-3 Function Block Diagram programming
* CTUD vehicle occupancy counter
* Entry sensor simulation
* Exit sensor simulation
* HMI entry command simulation
* HMI exit command simulation
* Maximum-capacity monitoring
* Full-lot entry interlock
* Empty-lot status indication
* Parking count reset
* OpenPLC debugger testing
* GitHub Pages project case study

## Control Logic

The system combines sensor and HMI requests through OR logic.

```text
Entry_Request = Entry_Sensor OR Entry_HMI
Exit_Request  = Exit_Sensor OR Exit_HMI
Reset_Request = Reset_Count OR Reset_HMI
```

The entry barrier is only allowed to open when an entry request is active and the parking lot is not full.

```text
Barrier_Open = Entry_Request AND NOT Lot_Full
```

The CTUD block performs the parking count logic:

```text
CU = Entry_Request
CD = Exit_Request
R  = Reset_Request
PV = Max_Capacity
CV = Car_Count
QU = Lot_Full
QD = Lot_Empty
```

## Operating Sequence

1. An entry sensor or HMI entry command generates an entry request.
2. The controller checks whether the parking lot is full.
3. If capacity is available, the barrier-open output becomes active.
4. The CTUD counter increments the vehicle count.
5. An exit sensor or HMI exit command decrements the count.
6. When the count reaches maximum capacity, the full-lot output becomes active.
7. The full-lot condition blocks additional barrier-open commands.
8. The reset command clears the vehicle count and restores the empty-lot state.

## Main Variables

| Variable        | Data Type | Purpose                               |
| --------------- | --------: | ------------------------------------- |
| `Entry_Sensor`  |      BOOL | Simulated entrance vehicle sensor     |
| `Exit_Sensor`   |      BOOL | Simulated exit vehicle sensor         |
| `Entry_HMI`     |      BOOL | Simulated HMI entry command           |
| `Exit_HMI`      |      BOOL | Simulated HMI exit command            |
| `Reset_Count`   |      BOOL | Simulated reset input                 |
| `Reset_HMI`     |      BOOL | Future HMI reset command              |
| `Entry_Request` |      BOOL | Combined sensor and HMI entry request |
| `Exit_Request`  |      BOOL | Combined sensor and HMI exit request  |
| `Reset_Request` |      BOOL | Combined reset request                |
| `Barrier_Open`  |      BOOL | Parking entrance barrier output       |
| `Lot_Full`      |      BOOL | Maximum-capacity status               |
| `Lot_Empty`     |      BOOL | Empty-lot status                      |
| `Car_Count`     |       INT | Current number of parked vehicles     |
| `Max_Capacity`  |       INT | Maximum parking-lot capacity          |
| `Load_Count`    |      BOOL | CTUD load-control input               |

## Simulation Testing

The controller was tested in the OpenPLC Online debugger.

The following scenarios were validated:

* Empty parking lot
* Entry sensor request
* Entry HMI request
* Exit sensor request
* Exit HMI request
* Full parking lot
* Reset operation
* Successful compile and runtime execution

## Project Screenshots

Screenshots are stored in the `docs/assets` folder.

```text
docs/assets/
├── complete-fbd.png
├── variable-table.png
├── empty-lot-test.png
├── entry-sensor-test.png
├── entry-hmi-test.png
├── exit-sensor-test.png
├── exit-hmi-test.png
├── full-lot-test.png
├── reset-test.png
└── plc-run-log.png
```

## Repository Structure

```text
Car-Parking-Lot-Barrier-Controller/
├── docs/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── assets/
│       ├── complete-fbd.png
│       ├── variable-table.png
│       ├── empty-lot-test.png
│       ├── entry-sensor-test.png
│       ├── entry-hmi-test.png
│       ├── exit-sensor-test.png
│       ├── exit-hmi-test.png
│       ├── full-lot-test.png
│       ├── reset-test.png
│       └── plc-run-log.png
├── README.md
├── LICENSE
└── .gitignore
```

## Technologies Used

* OpenPLC Online
* IEC 61131-3
* Function Block Diagram
* CTUD Function Block
* HTML5
* CSS3
* JavaScript
* Visual Studio Code
* Git
* GitHub
* GitHub Pages

## GitHub Pages

The project includes a responsive GitHub Pages case-study website inside the `docs` folder.

The website presents:

* Project overview
* Control requirements
* PLC logic
* Function Block Diagram
* Variable configuration
* Simulation screenshots
* Test results
* Version roadmap
* Repository information

GitHub Pages is enabled, the project page will be available at:

```text
https://jd-dev-king.github.io/Car-Parking-Lot-Barrier-Controller/
```

## Version Roadmap

### Version 1.0 — OpenPLC Logic and Simulation

Completed:

* Parking occupancy logic
* CTUD up/down counter
* Entry and exit simulation
* Capacity interlock
* Barrier control
* Full and empty indicators
* Debugger validation
* GitHub Pages documentation

### Version 2.0 — HMI and Modbus TCP Integration

Planned:

* CODESYS or FUXA HMI
* Modbus TCP communication
* Live parking occupancy display
* Entry and exit HMI controls
* Reset control
* Animated barrier status
* Full-lot alarm
* Event and alarm indicators
* Occupancy trend visualization

## Future Improvements

* Add separate entrance and exit barrier animations
* Add vehicle-detection timers
* Add barrier open and close delays
* Add sensor fault handling
* Add emergency override controls
* Add alarm acknowledgment
* Add occupancy history
* Add Modbus TCP communication
* Add industrial HMI visualization
* Add system architecture diagrams

## Project Status

Version 1.0 is complete.

The PLC logic has been developed, compiled, simulated, and tested successfully in OpenPLC Online.

Version 2.0 will focus on connecting the controller to an external HMI through Modbus TCP.

## Author

**Jeremiah Lupton**

GitHub: [jd-dev-king](https://github.com/jd-dev-king)

## License

This project is available for educational and portfolio purposes.
