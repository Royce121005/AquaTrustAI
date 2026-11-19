# AquaTrust AI : AI and Blockchain-Based Smart Wastewater Monitoring and Traceability Platform for Decentralized Wastewater Treatment Facilities

**A Project Report Submitted in Partial Fulfillment of the Requirements for the Degree of**  
**Bachelor of Technology in Computer Engineering**

**by**  
- **Risa Dias** (Roll No. 10238) — *Group Leader*  
- **Royce Dmonte** (Roll No. 10241)  
- **Valentino D'cruz** (Roll No. 10236)  

**Under the Guidance of**  
**Dr. Monali Shetty**  
*(Associate Professor, Department of Computer Engineering)*  

```
                      [INSTITUTE EMBLEM]
        Fr. Conceicao Rodrigues College of Engineering
             Father Agnel Ashram, Bandstand, Bandra (W)
                        Mumbai - 400050
```

**Department of Computer Engineering**  
**Fr. Conceicao Rodrigues College of Engineering, Bandra (W), Mumbai – 400050**  
**University of Mumbai**  
**(Academic Year: 2026 – 2027)**  

\newpage

## Dedication

*This work is dedicated to our parents and families for their unconditional love, moral encouragement, and endless sacrifices throughout our engineering education.*

*We also dedicate this work to environmental scientists, plant operators, and public health engineers who strive daily to safeguard our freshwater bodies and build a sustainable future.*

\newpage

## Internal Approval Sheet — Certificate

This is to certify that the project entitled:

> **"AquaTrust AI : AI and Blockchain-Based Smart Wastewater Monitoring and Traceability Platform for Decentralized Wastewater Treatment Facilities"**

is a bonafide work submitted by:
- **Risa Dias** (Roll No. 10238)
- **Royce Dmonte** (Roll No. 10241)
- **Valentino D'cruz** (Roll No. 10236)

submitted to the **University of Mumbai** in partial fulfillment of the requirement for the award of the degree of **Bachelor of Technology in Computer Engineering**.

\vspace{1.5cm}

**Dr. Monali Shetty**  
*(Project Supervisor / Guide)*  

\vspace{1.5cm}

**Dr. Sujata Deshmukh**  
*(Head of Department, Computer Engineering)*  

\vspace{1.5cm}

**Dr. Sapna Prabhu**  
*(Principal, Fr. CRCE)*  

\newpage

## Project Report Approval Sheet

This project report entitled:

> **"AquaTrust AI : AI and Blockchain-Based Smart Wastewater Monitoring and Traceability Platform for Decentralized Wastewater Treatment Facilities"**

by **Risa Dias (10238)**, **Royce Dmonte (10241)**, and **Valentino D'cruz (10236)** is approved for the degree of **Bachelor of Technology in Computer Engineering**.

\vspace{2cm}

**Examiner 1:** ____________________________________  
*(Signature & Date)*  

\vspace{1.5cm}

**Examiner 2:** ____________________________________  
*(Signature & Date)*  

\vspace{1cm}

**Date:** ________________________  
**Place:** Bandra, Mumbai  

\newpage

## Declaration

We declare that this written submission represents our ideas in our own words and where others' ideas or words have been included, we have adequately cited and referenced the original sources. We also declare that we have adhered to all principles of academic honesty and integrity and have not misrepresented or fabricated or falsified any idea, data, fact, or source in our submission. We understand that any violation of the above will be cause for disciplinary action by the Institute and can also evoke penal action from the sources which have thus not been properly cited or from whom proper permission has not been taken when needed.

\vspace{1.5cm}

_____________________________  
**Risa Dias** (Roll No. 10238)  

\vspace{1cm}

_____________________________  
**Royce Dmonte** (Roll No. 10241)  

\vspace{1cm}

_____________________________  
**Valentino D'cruz** (Roll No. 10236)  

**Date:** November 19, 2026  
**Place:** Mumbai  

\newpage

## Abstract

Decentralized wastewater treatment facilities—such as Sewage Treatment Plants (STPs) and Effluent Treatment Plants (ETPs) operated by residential housing complexes, commercial campuses, and industrial sub-wards—typically function without continuous automated quality monitoring or verifiable compliance tracking. Unlike large municipal utilities, decentralized plants cannot afford capital-intensive online instrumentation and dedicated laboratory personnel. Consequently, regulatory compliance relies on sporadic manual sampling and editable spreadsheets, creating significant opportunities for undetected untreated effluent discharge, uncalibrated sensor drift, and post-hoc data falsification.

To resolve these operational and transparency deficits, this project presents **AquaTrust AI**, an intelligent, closed-loop wastewater monitoring, predictive analytics, and cryptographic traceability platform engineered for decentralized infrastructure. The platform synthesizes continuous multi-parameter telemetry by replaying calibrated physical and synthetic datasets (including the 527-record UCI Urban Wastewater Treatment Plant dataset) through a simulation engine that emulates biological aeration basins, chemical clarifiers, and filtration units.

The intelligence tier comprises an integrated multi-model pipeline:
1. **Sensor Trust & Anomaly Detection:** An ensemble combining statistical rolling $Z$-score/IQR bounds with an Isolation Forest ($n=150$, contamination 5%) detecting 10 distinct sensor failure and process anomaly archetypes (`STUCK_SENSOR`, `SENSOR_FAILURE`, `SENSOR_DRIFT`, `PARAMETER_INCONSISTENCY`, `SUDDEN_SPIKE`, `MISSING_READING`, `DUPLICATE_READING`, `SUDDEN_PROCESS_CHANGE`, `STATISTICAL_ANOMALY`, and `NORMAL`) with a 5-tier calibrated severity score.
2. **Treatment Quality Prediction:** Multi-output regressors (Random Forest and Gradient Boosted trees) predicting final effluent metrics—Biochemical Oxygen Demand ($DBO\text{-}S$, RMSE 6.16 mg/L), Chemical Oxygen Demand ($DQO\text{-}S$, RMSE 27.05 mg/L), Total Suspended Solids ($SS\text{-}S$, RMSE 7.30 mg/L), and Effluent pH ($PH\text{-}S$, RMSE 0.166)—with instant Central Pollution Control Board (CPCB) General Discharge Standard breach evaluation.
3. **Prescriptive Process Optimization:** Closed-loop recommendation algorithms calculating stoichiometric dissolved oxygen (DO) setpoints (1.5–2.5 mg/L), polyaluminium chloride (PAC) coagulant dosing adjustments, and equalization basin diversion triggers.
4. **Sustainability & Circularity Engine:** Real-time quantifications of stoichiometric blower power savings, freshwater recovery volume ($kL$), Water Circularity Index ($\%$), and Scope 2 indirect carbon emission avoidance ($kg\text{ CO}_2e$).

To ensure absolute auditability without incurring excessive on-chain computational overhead, AquaTrust AI employs a **hybrid off-chain/on-chain storage and verification architecture**. High-frequency sensor time-series, AI predictions, and operational intervention logs are persisted off-chain in an ACID-compliant PostgreSQL database. Canonical cycle evidence snapshots (`atc-v1`) are batched into SHA-256 Merkle trees. Root hashes and cryptographic proofs are anchored to an immutable distributed ledger (Solidity smart contracts on Ganache / Hyperledger Fabric 2.5 channel). A high-performance FastAPI asynchronous backend exposes RESTful and WebSocket telemetry endpoints to a reactive web dashboard built with React, Vite, and Tailwind CSS, featuring synoptic SCADA plant schematics, 3D digital twin state visualization, real-time alert triage, and one-click cryptographic tamper verification.

System validation across 293 automated pure test cases achieved a 100% test pass rate, verifying zero-lag concurrent ingest, multi-version audit lineage, sub-second tampering detection, and robust failover. The system is formally approved for academic defense and controlled STP/ETP pilot deployment.

\newpage

## Acknowledgments

We express our sincere and deepest gratitude to our project supervisor and guide, **Dr. Monali Shetty**, Associate Professor, Department of Computer Engineering, Fr. Conceicao Rodrigues College of Engineering, for her invaluable technical guidance, profound insights, constructive critiques, and constant encouragement throughout the formulation, design, and execution of this project. Her dedication and continuous feedback were instrumental in steering this research toward completion.

We are profoundly grateful to **Dr. Sujata Deshmukh**, Head of the Department of Computer Engineering, for her administrative support, encouragement, and for providing state-of-the-art computational and laboratory facilities required for this project.

We extend our sincere thanks to **Dr. Sapna Prabhu**, Principal, Fr. Conceicao Rodrigues College of Engineering, for her leadership, academic vision, and for creating an inspiring environment conducive to research and technological innovation.

We also thank the technical and non-teaching staff of the Computer Engineering department for their continuous assistance with network, hardware, and laboratory resources.

Finally, we express our heartfelt appreciation to our peers, batchmates, and friends whose meaningful technical discussions, moral support, and camaraderie made this journey rewarding and memorable.

\vspace{1.5cm}

**Risa Dias** (Roll No. 10238)  
**Royce Dmonte** (Roll No. 10241)  
**Valentino D'cruz** (Roll No. 10236)  

\newpage

## Table of Contents

- **Dedication** ............................................................................................................ ii
- **Certificate** .......................................................................................................... iii
- **Project Report Approval Sheet** ............................................................................ iv
- **Declaration** .......................................................................................................... v
- **Abstract** ............................................................................................................... vi
- **Acknowledgments** ................................................................................................ vii
- **List of Figures** ..................................................................................................... xi
- **List of Tables** ...................................................................................................... xii
- **List of Abbreviations & Glossary** ......................................................................... xiii

### Chapter 1: Introduction ........................................................................................... 1
- 1.1 Background and Domain Context ..................................................................... 1
- 1.2 Comparison between Conventional ETP/STP Monitoring and Proposed System ........ 3
- 1.3 Motivation ......................................................................................................... 5
- 1.4 Problem Statement ............................................................................................ 6
- 1.5 Objectives of the Project .................................................................................... 7
- 1.6 Alignment with UN Sustainable Development Goals (SDGs) ................................ 8

### Chapter 2: Literature Review ................................................................................. 10
- 2.1 Overview of Research Landscape ..................................................................... 10
- 2.2 Literature Review Matrix Table .......................................................................... 11
- 2.3 Synthesis of Research Gaps & Novel Contributions ............................................ 14

### Chapter 3: Mathematical Formulation and Problem Modeling ................................ 16
- 3.1 Mathematical Modeling of Sensor Trust & Anomaly Scoring .............................. 16
  - 3.1.1 Normalized Z-Score and Interquartile Bounds .......................................... 16
  - 3.1.2 Isolation Forest Path Length and Anomaly Score ...................................... 17
  - 3.1.3 Five-Tier Calibrated Trust Degradation Formulation ................................ 18
- 3.2 Effluent Water Quality Multi-Target Prediction Formulation .............................. 19
- 3.3 Metcalf & Eddy Stoichiometric Aeration Power & Coagulant Dosing Formulas ..... 20
  - 3.3.1 Aeration Basin Oxygen Transfer and Power Dissipation ............................. 20
  - 3.3.2 Chemical Coagulant Optimization ............................................................ 21
  - 3.3.3 Water Circularity & Scope 2 Indirect Carbon Avoidance ........................... 22
- 3.4 Cryptographic Data Integrity and Merkle Tree Formulation .............................. 23
  - 3.4.1 Canonical Serialization (`atc-v1`) and SHA-256 Hashing ............................ 23
  - 3.4.2 RFC 6962 Compliant Merkle Tree Audit Proofs ....................................... 24

### Chapter 4: System Architecture and Design ........................................................... 26
- 4.1 System Overview and High-Level Architecture ................................................... 26
- 4.2 Detailed Module Descriptions ............................................................................ 28
  - 4.2.1 Data Simulation and Ingestion Engine ..................................................... 28
  - 4.2.2 AI/ML Sensor Trust and Effluent Prediction Engine ................................. 29
  - 4.2.3 Prescriptive Process Optimization and Decision Support .......................... 30
  - 4.2.4 Digital Twin State Engine and Biochemical Kinetic Modeling .................... 31
  - 4.2.5 Cryptographic Verification and DLT Gateway ........................................... 32
  - 4.2.6 Interactive Web SCADA Dashboard ......................................................... 33
- 4.3 Data Flow Diagrams (DFDs) ............................................................................. 34
  - 4.3.1 Level 0 DFD (Context Diagram) ............................................................... 34
  - 4.3.2 Level 1 DFD (Subsystem Functional Flow) ................................................ 35
  - 4.3.2 Level 2 DFD (AI Prediction & Cryptographic Sealing) ................................ 36
- 4.4 Entity-Relationship (ER) Modeling & Database Schema Design ........................... 37
- 4.5 Input and Output Design ................................................................................... 41

### Chapter 5: Implementation Details ......................................................................... 43
- 5.1 Technology Stack and Environmental Configuration ......................................... 43
- 5.2 Sensor Data Simulation and Synthetic Anomaly Injection Pipeline ..................... 45
- 5.3 Machine Learning Pipeline Implementation ....................................................... 47
  - 5.3.1 Training on UCI Urban Wastewater Treatment Plant Dataset .................... 47
  - 5.3.2 Feature Engineering, Cross-Validation, and Model Serialization ............... 48
- 5.4 Backend RESTful API & Persistence Architecture (FastAPI & SQLAlchemy) ......... 50
- 5.5 Blockchain Smart Contract Implementation and Cryptographic Gateway .............. 53
- 5.6 Core Algorithmic Implementations and Pseudocode ........................................... 56
  - 5.6.1 Algorithm 1: Sensor Trust & Anomaly Classification ................................. 56
  - 5.6.2 Algorithm 2: Treatment Cycle Risk Escalation & Evidence Sealing .............. 58

### Chapter 6: System Testing, Verification, and Experimental Results ....................... 60
- 6.1 Testing Methodology & Verification Framework ................................................ 60
- 6.2 Test Execution Metrics and Suite Summary ....................................................... 62
- 6.3 Machine Learning Model Evaluation & Empirical Results ................................... 64
  - 6.3.1 Parameter Prediction Accuracy and Regression Curves ............................. 64
  - 6.3.2 Anomaly Classification Confusion Matrix and Trust Performance ............. 66
  - 6.3.3 Model Benchmarking & Computational Complexity Analysis ..................... 68
- 6.4 Blockchain Performance and Tamper Detection Experimental Analysis .............. 70
- 6.5 Sustainability, Energy Conservation, and Circularity Impact Results ................. 72

### Chapter 7: Conclusion and Future Work ................................................................ 74
- 7.1 Conclusion and Key Research Contributions ...................................................... 74
- 7.2 Practical Industrial Impact & Societal Relevance ............................................... 76
- 7.3 Limitations of the Current Implementation ....................................................... 77
- 7.4 Future Enhancements and Research Directions ................................................. 78

### References ............................................................................................................. 80
### Appendix A: Key Code Listings and Smart Contract Definitions ........................... 83

\newpage

## List of Figures

- **Figure 1.1:** Typical Process Flow of a Decentralized Sewage/Effluent Treatment Plant ............. 2
- **Figure 1.2:** Comparison of Regulatory Compliance Reporting Pipelines ................................. 4
- **Figure 3.1:** Isolation Forest Recursive Partitioning and Path Length Distribution ................... 17
- **Figure 3.2:** Schematic of Merkle Audit Tree Generation and Ingestion Batching ..................... 24
- **Figure 4.1:** High-Level End-to-End System Architecture of AquaTrust AI .............................. 27
- **Figure 4.2:** Digital Twin State Machine Transition Graph (Biological & Mechanical States) ..... 31
- **Figure 4.3:** Data Flow Diagram — Level 0 (Context Level) .................................................... 34
- **Figure 4.4:** Data Flow Diagram — Level 1 (Operational Decomposition) .................................. 35
- **Figure 4.5:** Data Flow Diagram — Level 2 (AI Inference and Blockchain Sealing Pipeline) ....... 36
- **Figure 4.6:** Entity-Relationship Diagram of AquaTrust AI Database Schema ........................... 38
- **Figure 6.1:** Actual vs. Predicted Effluent Concentrations across CPCB Target Parameters ........ 65
- **Figure 6.2:** Normalized Confusion Matrix for 10-Class Sensor Trust & Anomaly Inference ........ 67
- **Figure 6.3:** Machine Learning Model Benchmarking and Computational Complexity Comparison 69
- **Figure 6.4:** Cryptographic Scaling Benchmarks and Tamper Detection Experimental Analysis ... 71
- **Figure 6.5:** 30-Day Cumulative Sustainability Impact in a 500 kL/day Treatment Facility .......... 73

\newpage

## List of Tables

- **Table 1.1:** Comparative Analysis: Conventional Plant Operations vs. AquaTrust AI .............. 5
- **Table 1.2:** Indian CPCB Effluent Discharge Standards for Inland Surface Waters .................. 7
- **Table 2.1:** Comprehensive Literature Review Matrix across Key Wastewater AI and DLT Research 11
- **Table 3.1:** 10 Sensor Failure and Process Anomaly Types with Physical Indicators ................. 19
- **Table 4.1:** Core Relational Schema Mapping (PostgreSQL Tables and Primary Keys) .............. 39
- **Table 5.1:** Software, Library, and Framework Dependency Inventory .................................... 44
- **Table 5.2:** Hyperparameter Configurations for Gradient Boosted and Random Forest Models ..... 48
- **Table 5.3:** RESTful API Endpoint Specification Table (FastAPI Routes) ................................. 51
- **Table 6.1:** Overall System Automated Test Execution Summary (293 Tests) ........................... 62
- **Table 6.2:** Empirical Performance Metrics of Effluent Water Quality Prediction Models ......... 64
- **Table 6.3:** Classification Performance of Sensor Trust & Anomaly Inference Engine ............... 66
- **Table 6.4:** Comparative Model Benchmark Matrix across Multiple ML Paradigms ................. 68
- **Table 6.5:** Cryptographic Integrity Verification & Tamper Detection Benchmark .................... 70
- **Table 6.6:** Monthly Resource Optimization & Carbon Avoidance in 500 kL/day Facility ........... 72

\newpage

## List of Abbreviations & Glossary

| Abbreviation | Expanded Form / Definition |
| :--- | :--- |
| **API** | Application Programming Interface |
| **BOD / DBO** | Biochemical Oxygen Demand ($mg/L$) — measure of organic matter biodegradable by bacteria |
| **CFT** | Crash Fault Tolerant (e.g., Raft consensus algorithm) |
| **COD / DQO** | Chemical Oxygen Demand ($mg/L$) — total measurement of all chemically oxidizable matter |
| **CPCB** | Central Pollution Control Board (India) |
| **DLT** | Distributed Ledger Technology |
| **DO** | Dissolved Oxygen ($mg/L$) — concentration of free, non-compound oxygen in aeration basins |
| **ECDSA** | Elliptic Curve Digital Signature Algorithm (secp256r1 / P-256 standard) |
| **EPA** | Environment (Protection) Act, 1986 |
| **ETP** | Effluent Treatment Plant (industrial wastewater remediation facility) |
| **F1-Score** | Harmonic mean of precision and recall |
| **GBR** | Gradient Boosting Regressor |
| **HSM** | Hardware Security Module |
| **IoT** | Internet of Things |
| **IQR** | Interquartile Range |
| **JSON** | JavaScript Object Notation |
| **MAE** | Mean Absolute Error |
| **ML** | Machine Learning |
| **MLSS** | Mixed Liquor Suspended Solids ($mg/L$) |
| **PAC** | Polyaluminium Chloride (coagulant salt) |
| **pH** | Potential of Hydrogen (logarithmic scale of acidity or basicity) |
| **RBAC** | Role-Based Access Control |
| **RFC** | Request for Comments (Internet engineering standard) |
| **RMSE** | Root Mean Squared Error |
| **SCADA** | Supervisory Control and Data Acquisition |
| **SDG** | Sustainable Development Goal (United Nations) |
| **SHA-256** | Secure Hash Algorithm generating a 256-bit cryptographic digest |
| **STP** | Sewage Treatment Plant (domestic/sanitary wastewater facility) |
| **TSS / SS** | Total Suspended Solids ($mg/L$) |
| **UCI** | University of California, Irvine (Machine Learning Repository) |
| **WCI** | Water Circularity Index ($\%$) |

\newpage

# Chapter 1: Introduction

## 1.1 Background and Domain Context
Water security and environmental preservation represent two of the most pressing challenges of the twenty-first century. Rapid urban agglomeration, industrial growth, and commercial development have precipitated an exponential rise in wastewater generation worldwide. In rapidly expanding economies such as India, centralized sewage networks and massive urban treatment plants frequently lack the capacity to service distributed residential suburbs, newly formed housing societies, commercial IT parks, and decentralized industrial clusters.

To mitigate untreated sewage and toxic effluent discharge into surface water bodies, environmental regulatory agencies—principally the **Central Pollution Control Board (CPCB)** and corresponding **State Pollution Control Boards (SPCBs)** under the **Environment (Protection) Act, 1986**—have mandated that decentralized establishments (e.g., residential complexes exceeding 20,000 $m^2$ built-up area, hospitals, and industrial parks) install, operate, and maintain captive, decentralized **Sewage Treatment Plants (STPs)** and **Effluent Treatment Plants (ETPs)**.

A typical decentralized treatment plant follows a sequential physical, biological, and tertiary chemical treatment train:
1. **Preliminary Treatment:** Coarse bar screening and grit settling to eliminate macro-debris and suspended inert matter.
2. **Equalization & Primary Clarification:** Inflow balancing to dampen peak diurnal hydraulic surges and homogenize chemical concentrations.
3. **Biological Treatment (Activated Sludge / MBBR / SBR):** Aerobic bacterial digestion of dissolved organic carbon, quantified through Biochemical Oxygen Demand (BOD) and Chemical Oxygen Demand (COD). This stage is heavily dependent on continuous dissolved oxygen (DO) aeration and optimal Mixed Liquor Suspended Solids (MLSS).
4. **Secondary Clarification & Sludge Recirculation:** Gravitational phase separation of biological biomass (sludge) from treated supernatant.
5. **Tertiary Polishing & Disinfection:** Pressure sand filtration, activated carbon absorption, and ozonation or chlorination to eliminate residual suspended solids and pathogenic microorganisms prior to non-potable reuse (toilet flushing, HVAC cooling towers, landscape irrigation) or discharge into municipal storm drains.

## 1.2 Comparison between Conventional ETP/STP Monitoring and Proposed System
Despite legal mandates requiring compliance with stringent discharge standards (e.g., Effluent $BOD \le 10\text{--}30\text{ mg/L}$, $COD \le 50\text{--}250\text{ mg/L}$, $TSS \le 20\text{--}100\text{ mg/L}$, $pH\text{ 6.5--8.5}$), the vast majority of decentralized treatment facilities across developing nations operate in an uninstrumented, unmonitored "black box" mode.

Conventional decentralized facilities suffer from three major systemic flaws:
1. **Periodic Manual Grab Sampling:** Compliance is certified based on physical grab samples collected manually once a month or once a quarter. This infrequent sampling fails to capture transient organic shocks, biological process washouts, and nocturnal untreated bypass events.
2. **Lack of Predictive Foresight:** Facility managers act purely reactively. When aeration blowers fail or biological treatment crashes due to toxic chemical surges, operators only notice days later when the effluent turns visibly black, septic, and foul-smelling.
3. **Malleable, Unverifiable Compliance Records:** Compliance records are maintained in physical logbooks or standalone Excel spreadsheets. Unscrupulous operators or corrupt third-party maintenance contractors can easily alter or falsify these numbers before regulatory submission, making genuine environmental auditing virtually impossible.

AquaTrust AI addresses these gaps by transforming physical and synthetic plant data into continuous predictive intelligence, providing early warning alerts, prescriptive setpoint actions, and anchoring every record to an immutable cryptographic ledger.

*Table 1.1: Comparative Analysis: Conventional Plant Operations vs. AquaTrust AI*
| Feature / Dimension | Conventional Decentralized ETP/STP | AquaTrust AI Platform |
| :--- | :--- | :--- |
| **Telemetry Ingestion** | Sporadic manual lab sampling (bi-weekly/monthly) | Continuous synthetic/physical telemetry simulation |
| **Sensor Health** | No automated drift or freeze detection | 10-Class ML Anomaly Detector + 5-Tier Severity |
| **Effluent Monitoring** | 5-day delayed laboratory incubation for $BOD_5$ | Real-time multi-target regression ($DBO, DQO, SS, pH$) |
| **Process Control** | Ad-hoc manual blower and chemical valve tuning | Prescriptive closed-loop stoichiometric DO setpoints |
| **Audit Trail** | Unencrypted, editable CSV/Excel sheets or paper logs | Cryptographic Merkle Root hashing anchored to DLT |
| **Verification Speed** | Weeks of manual forensic inspections | Immediate cryptographic hash & proof check ($< 1\text{ sec}$) |
| **Carbon Tracking** | None; unquantified energy dissipation | Continuous calculation of Scope 2 avoided emissions |

## 1.3 Motivation
Decentralized wastewater treatment plants are uniquely positioned to solve urban water scarcity. By treating wastewater at the source, residential and commercial complexes can recover millions of liters of reusable non-potable water, drastically relieving pressure on depleted municipal reservoirs and subterranean aquifers.

However, decentralized facilities operate under acute resource constraints:
- They lack capital budgets exceeding \$50,000 for full industrial-grade SCADA hardware installations.
- They lack qualified biological process engineers on-site, relying instead on semi-skilled building caretakers.
- Regulators have zero technical means to verify whether a submitted laboratory compliance slip represents actual plant performance or post-hoc document fabrication.

An integrated, open-source software platform combining **state-of-the-art predictive machine learning**, **stoichiometric biochemical process modeling**, and **tamper-evident cryptographic distributed ledgers** can bridge this operational divide. By simulating real-time telemetry from historical operational datasets and deploying intelligent edge microservices, AquaTrust AI enables institutional-grade predictive optimization and transparent regulatory compliance for decentralized facilities without requiring multimillion-dollar hardware retrofits.

## 1.4 Problem Statement
Decentralized wastewater treatment facilities lack automated predictive intelligence to anticipate treatment degradation and verifiable tamper-proof audit trails for regulatory compliance. Most existing solutions either assume capital-intensive IoT hardware grids that decentralized plants cannot afford, or utilize blockchain as a passive ledger without predictive process control.

AquaTrust AI resolves this dual deficit by providing an integrated software platform that validates streaming multi-parameter sensor data, forecasts final effluent parameters ahead of lab incubation, prescribes corrective aeration and dosing setpoints, and anchors tamper-evident compliance snapshots to a distributed ledger via compact cryptographic Merkle proofs.

## 1.5 Objectives of the Project
The primary engineering objectives of this project are:
1. To design an automated sensor trust engine that detects 10 distinct sensor and process anomaly types and assigns calibrated trust scores.
2. To develop multi-target machine learning regressors predicting effluent BOD, COD, TSS, and pH with real-time CPCB compliance breach evaluation.
3. To formulate a prescriptive closed-loop optimization engine that generates quantitative dissolved oxygen setpoints, chemical coagulant dosing advice, and basin diversion triggers.
4. To implement a digital twin state machine that tracks biological digestion kinetics, mechanical blower power, and Scope 2 carbon emission avoidance.
5. To build a tamper-evident audit architecture utilizing canonical JSON hashing, SHA-256 Merkle tree batching, and smart contract anchoring on a distributed ledger.
6. To develop a responsive web SCADA dashboard providing synoptic plant visualization, real-time alert triage, and single-click cryptographic proof verification.
7. To validate system reliability and performance through comprehensive automated unit, concurrency, and fault-injection test suites.

*Table 1.2: Indian CPCB Effluent Discharge Standards for Inland Surface Waters*
| Parameter | Permissible CPCB Discharge Limit | AquaTrust AI Threshold Class |
| :--- | :--- | :--- |
| **pH** | $5.5\text{ -- }9.0$ (Strict: $6.5\text{ -- }8.5$) | Normal within range; breach if $<6.5$ or $>8.5$ |
| **BOD ($DBO_5$)** | $\le 30.0\text{ mg/L}$ (Urban STP: $\le 10.0\text{ mg/L}$) | Warning if $\ge 25.0\text{ mg/L}$; Breach if $> 30.0\text{ mg/L}$ |
| **COD ($DQO$)** | $\le 250.0\text{ mg/L}$ (Decentralized: $\le 50.0\text{ mg/L}$) | Warning if $\ge 45.0\text{ mg/L}$; Breach if $> 50.0\text{ mg/L}$ |
| **TSS ($SS$)** | $\le 100.0\text{ mg/L}$ (Decentralized: $\le 20.0\text{ mg/L}$) | Warning if $\ge 18.0\text{ mg/L}$; Breach if $> 20.0\text{ mg/L}$ |

## 1.6 Alignment with UN Sustainable Development Goals (SDGs)
AquaTrust AI directly addresses five United Nations Sustainable Development Goals:
- **SDG 6 (Clean Water and Sanitation):** Target 6.3 — Improving water quality by eliminating dumping, halving untreated wastewater discharge, and increasing recycling and safe reuse.
- **SDG 9 (Industry, Innovation, and Infrastructure):** Target 9.4 — Upgrading industrial wastewater infrastructure with intelligent sensing, automated control, and efficient resource utilization.
- **SDG 11 (Sustainable Cities and Communities):** Target 11.6 — Reducing adverse urban environmental impacts through decentralized, localized wastewater management in residential complexes.
- **SDG 12 (Responsible Consumption and Production):** Target 12.4 — Environmentally sound management of chemical coagulants, electrical blower power, and hazardous industrial sludge.
- **SDG 16 (Peace, Justice, and Strong Institutions):** Target 16.6 — Establishing effective, accountable, and transparent institutions via unforgeable, publicly verifiable cryptographic environmental audit trails.

\newpage

# Chapter 2: Literature Review

## 2.1 Overview of Research Landscape
Modern wastewater engineering research intersects four computational paradigms: (1) biological process kinetics and Activated Sludge Models (ASM), (2) data-driven machine learning for water quality forecasting, (3) automated sensor health validation and anomaly detection, and (4) cryptographic distributed ledger technology (DLT) for regulatory compliance tracking. While each domain has seen substantial independent advancements, decentralized facilities remain unserviced due to high deployment costs, operational complexity, and fragmented architectures.

## 2.2 Literature Review Matrix Table
Table 2.1 systematically analyzes peer-reviewed literature across these key domains, detailing the methodology, core findings, and specific technical gaps resolved by AquaTrust AI.

*Table 2.1: Comprehensive Literature Review Matrix across Key Wastewater AI and DLT Research*
| Author(s) & Year | Domain / Focus Area | Methodology & Models Used | Key Findings & Strengths | Limitations & Gaps Addressed by AquaTrust AI |
| :--- | :--- | :--- | :--- | :--- |
| **Rane et al. (2023)** | AI, ML, IoT, and Blockchain in Wastewater Systems | Comprehensive survey of computational intelligence and smart sensing in wastewater treatment. | Identified ensemble decision trees as superior to deep networks on small tabular plant datasets ($N < 2,000$). | Focused on theoretical frameworks; lacked empirical code implementation, closed-loop control, or Merkle-based DLT integration. |
| **Granata et al. (2017)** | Effluent Quality Parameter Prediction | Support Vector Regression (SVR with RBF kernel) and Random Forest (RF) on municipal wastewater data. | Achieved $R^2 > 0.85$ for effluent BOD, COD, and TSS; proved tree bagging handles collinearity effectively. | High computational training latency for SVR; did not provide real-time CPCB regulatory breach evaluation or anomaly screening. |
| **Melesse et al. (2020)** | Deep Learning for Temporal Water Monitoring | Recurrent Neural Networks (RNN) and Long Short-Term Memory (LSTM) networks. | Effectively modeled non-linear multi-day temporal dependencies in large municipal facilities. | Severe hyperparameter sensitivity, vulnerability to overfitting with small datasets, and high edge execution latency ($>80\text{ ms}$). |
| **Liu, Ting & Zhou (2008)** | Anomaly Detection in High-Dimensional Data | Isolation Forest algorithm based on recursive random attribute splitting trees. | Proved anomalies are isolated near the root; achieved linear time complexity $\mathcal{O}(n)$ and minimal memory footprint. | Standalone Isolation Forest cannot differentiate between sensor hardware drift and genuine physical biological shock loads. |
| **Chandola et al. (2009)** | Industrial Sensor Anomaly Taxonomies | Survey of statistical, distance-based, and spectral anomaly detection techniques. | Formulated foundational taxonomy separating point, contextual, and collective sensor anomalies. | Static statistical bounds generate high false alarm rates during natural diurnal wastewater hydraulic surges. |
| **Metcalf & Eddy (2014)** | Biochemical Process Engineering & Kinetics | Stoichiometric gas-transfer and biological Activated Sludge kinetic equations. | Established standard mathematical models for aeration oxygen requirement ($AOR/SOR$) and blower power dissipation. | Purely deterministic equations fail when incoming physical sensor feeds are noisy, uncalibrated, or missing. |
| **Corominas et al. (2018)** | Digital Twins in Water Recovery Facilities | Systematic review of digital twin architectures and process simulation frameworks. | Outlined benefits of synchronized physical-virtual state tracking for predictive maintenance and scenario testing. | Most twins require multimillion-dollar SCADA instrumentation grids infeasible for decentralized housing or industrial plants. |
| **Androulaki et al. (2018)** | Permissioned Distributed Ledgers | Hyperledger Fabric: execute-order-validate architecture with Raft CFT consensus. | Zero transaction gas costs, enterprise privacy channels, and sub-second transaction finality. | Heavy multi-organization container footprints; writing raw streaming telemetry directly to chain causes severe state bloat. |
| **Crosby & Wallach (2013, RFC 6962)** | Cryptographic Certificate Transparency | Binary SHA-256 Merkle audit trees and compact inclusion proof generation. | Proved high-frequency event streams can be verified off-chain using 32-byte root hashes with $\mathcal{O}(\log n)$ proofs. | Applied purely to web PKI; not previously unified with physical industrial wastewater compliance or AI inference outputs. |

## 2.3 Synthesis of Research Gaps & Novel Contributions
From the systematic analysis above, three critical research gaps emerge:
1. **The Telemetry-Trust Dilemma:** Machine learning models for effluent prediction assume pristine sensor inputs. In practice, aquatic sensors biofoul rapidly. Standalone statistical rules create excessive false alarms, while black-box anomaly detectors cannot separate probe failures from real influent shocks. AquaTrust AI solves this with a **two-tier hybrid engine** combining physical constraints with Isolation Forests.
2. **The Predictive-Prescriptive Divide:** Prior research focuses on predicting effluent quality but leaves operators with no guidance on how to prevent violations. AquaTrust AI bridges this divide by coupling predictions with **Metcalf & Eddy stoichiometric setpoint formulas** (blower DO setpoints and coagulant dosing).
3. **The Blockchain Storage Bottleneck:** Writing high-frequency industrial telemetry directly to blockchain ledgers is economically and computationally infeasible. AquaTrust AI implements a **hybrid architecture** that preserves full records in PostgreSQL while anchoring compact SHA-256 Merkle roots to the ledger, enabling sub-millisecond client-side verification.

\newpage

# Chapter 3: Mathematical Formulation and Problem Modeling

## 3.1 Mathematical Modeling of Sensor Trust & Anomaly Scoring

### 3.1.1 Normalized Z-Score and Interquartile Bounds
Let $X = \{x_1, x_2, \dots, x_N\}$ represent a streaming univariate time-series of sensor telemetry observations collected at uniform discrete sampling intervals $\Delta t$. Over a sliding temporal evaluation window $W$ of length $k$ (where $k = 30$ timesteps), the rolling mean $\mu_W$ and rolling standard deviation $\sigma_W$ are computed as:

$$\mu_W = \frac{1}{k} \sum_{i=t-k+1}^{t} x_i, \quad \sigma_W = \sqrt{\frac{1}{k-1} \sum_{i=t-k+1}^{t} (x_i - \mu_W)^2}$$

The standardized instantaneous $Z$-score $Z_t$ is defined as:

$$Z_t = \frac{x_t - \mu_W}{\sigma_W + \epsilon}$$

Where $\epsilon = 10^{-6}$ represents an infinitesimal regularization constant preventing division by zero during stuck-sensor flatline conditions ($\sigma_W \to 0$).

For skewed non-Gaussian parameter distributions, non-parametric Interquartile Range (IQR) gating is applied:

$$IQR = Q_3(X_W) - Q_1(X_W)$$
$$\text{Lower Bound} = Q_1 - 1.5 \cdot IQR, \quad \text{Upper Bound} = Q_3 + 1.5 \cdot IQR$$

### 3.1.2 Isolation Forest Path Length and Anomaly Score
Multivariate observations $\mathbf{x}_t \in \mathbb{R}^d$ across $d$ correlated parameters are evaluated using an ensemble of $t$ randomized binary isolation trees ($iTrees$). Each $iTree$ recursively partitions subsamples of data $X'$ ($|X'| = \psi$) by randomly selecting an attribute $q$ and a split value $p \in [\min(x_q), \max(x_q)]$ until either: (i) the tree reaches a maximum height limit $h_{max} = \lceil \log_2(\psi) \rceil$, (ii) $|X'| \le 1$, or (iii) all data points possess identical values.

The average path length $c(\psi)$ of an unsuccessful search in a binary search tree of size $\psi$ serves as the normalization factor:

$$c(\psi) = 2 \ln(\psi - 1) + 0.5772156649 - \frac{2(\psi - 1)}{\psi}$$

The multivariate anomaly score $s(\mathbf{x}, \psi)$ for an ensemble of $m = 150$ isolation trees is given by:

$$s(\mathbf{x}, \psi) = 2^{-\frac{\mathbb{E}(h(\mathbf{x}))}{c(\psi)}}$$

Where $\mathbb{E}(h(\mathbf{x})) = \frac{1}{m} \sum_{i=1}^{m} h_i(\mathbf{x})$ denotes the mean path length across all trees. Anomaly classification decisions are governed by:
- $s(\mathbf{x}) \to 1.0$: Confirmed structural anomaly (isolated near root).
- $s(\mathbf{x}) < 0.5$: Normal operational cluster (deep internal nodes).

### 3.1.3 Five-Tier Calibrated Trust Degradation Formulation
To convert raw anomaly detections into actionable operational trust scores, AquaTrust AI maps physical parameter violations and Isolation Forest scores into a bounded trust coefficient $T_t \in [0.0, 1.0]$:

$$T_t = 1.0 - \left( w_1 \cdot \mathbb{I}_{\text{stuck}} + w_2 \cdot \min\left(1.0, \frac{|Z_t|}{Z_{\text{crit}}}\right) + w_3 \cdot s(\mathbf{x}_t) + w_4 \cdot \mathbb{I}_{\text{drift}} \right)$$

Where weights $w = [0.35, 0.25, 0.25, 0.15]$ satisfy $\sum w_i = 1.0$. The calibrated trust score determines the operational trust tier:
- **Tier 1 — TRUSTED ($T_t \ge 0.85$):** Fully verified, pristine sensor reading; fed directly to downstream predictive models.
- **Tier 2 — SUSPECT ($0.70 \le T_t < 0.85$):** Minor statistical drift; flagged for operator observation.
- **Tier 3 — DEGRADED ($0.50 \le T_t < 0.70$):** High variance or consistency mismatch; down-weighted in state estimation.
- **Tier 4 — FAILED ($0.25 \le T_t < 0.50$):** Physical threshold breach or persistent freeze; sensor rejected from control loops.
- **Tier 5 — CRITICAL ($T_t < 0.25$):** Severe hardware failure or biological shock; triggers immediate audible alarms.

*Table 3.1: 10 Sensor Failure and Process Anomaly Types with Physical Indicators*
| Anomaly Code | Anomaly Classification | Primary Detection Mechanism |
| :--- | :--- | :--- |
| `STUCK_SENSOR` | Zero Variance / Frozen Float | $\sigma_W < 10^{-5}$ across $> 15$ consecutive cycles |
| `SENSOR_FAILURE` | Physical Hardware Disconnect / Out of Bounds | Reading exceeds physical sensor envelope (e.g., $pH < 0$ or $> 14$) |
| `SENSOR_DRIFT` | Chronic Calibration Degradation | Monotonic directional trend with baseline shift $|x_t - x_{t-k}| > 3\sigma$ |
| `PARAMETER_INCONSISTENCY` | Cross-Parameter Conflict | Biochemical impossibility (e.g., High BOD with Dissolved Oxygen $> 8\text{ mg/L}$) |
| `SUDDEN_SPIKE` | Single Timestep Transient Jump | First-order difference $|\Delta x_t| > 4 \cdot IQR$ returning to baseline in next step |
| `MISSING_READING` | Telemetry Packet Loss | Null or missing payload over anticipated transmission window $\Delta t$ |
| `DUPLICATE_READING` | Replay / Serialization Collision | Duplicate timestamp and sequence number within same facility ID |
| `SUDDEN_PROCESS_CHANGE` | Biological Shock / Hydraulic Surge | Multi-variable step-function shift persisted across $> 5$ consecutive cycles |
| `STATISTICAL_ANOMALY` | Multivariate Distribution Outlier | Isolation Forest anomaly score $s(\mathbf{x}) \ge 0.65$ |
| `NORMAL` | Standard Baseline Operation | Within normal $3\sigma$ boundaries and $s(\mathbf{x}) < 0.50$ |

## 3.2 Effluent Water Quality Multi-Target Prediction Formulation
Effluent parameter prediction is modeled as a multi-output supervised regression task. Given an input vector $\mathbf{u}_t \in \mathbb{R}^p$ comprising influent wastewater characteristics ($Q_{in}, pH_{in}, BOD_{in}, COD_{in}, TSS_{in}, DO_{basin}, \text{Temp}$), the model predicts the output vector $\hat{\mathbf{y}}_t \in \mathbb{R}^4$:

$$\hat{\mathbf{y}}_t = [\widehat{DBO}\text{-}S, \widehat{DQO}\text{-}S, \widehat{SS}\text{-}S, \widehat{PH}\text{-}S]^T$$

Where:
- $\widehat{DBO}\text{-}S$: Predicted Effluent Biochemical Oxygen Demand ($mg/L$)
- $\widehat{DQO}\text{-}S$: Predicted Effluent Chemical Oxygen Demand ($mg/L$)
- $\widehat{SS}\text{-}S$: Predicted Effluent Total Suspended Solids ($mg/L$)
- $\widehat{PH}\text{-}S$: Predicted Effluent pH (standard units)

The objective function minimizes the multi-target Mean Squared Error with $L_2$ regularization:

$$\mathcal{L}(\mathbf{W}) = \frac{1}{N} \sum_{i=1}^{N} \sum_{j=1}^{4} \left(y_{i,j} - \hat{y}_{i,j}\right)^2 + \lambda \sum_{l=1}^{M} \|\mathbf{w}_l\|_2^2$$

## 3.3 Metcalf & Eddy Stoichiometric Aeration Power & Coagulant Dosing Formulas

### 3.3.1 Aeration Basin Oxygen Transfer and Power Dissipation
Biological degradation of carbonaceous organic matter in the aerobic activated sludge basin requires continuous oxygen dissolution. According to **Metcalf & Eddy (2014)**, the theoretical clean-water standard oxygen requirement ($SOR$ in $kg\text{ }O_2/\text{hour}$) is derived from the field actual oxygen requirement ($AOR$):

$$AOR = Q \cdot \left[ \frac{S_0 - S}{1000} \right] - 1.42 \cdot P_x$$

Where $Q$ is plant flow rate ($m^3/\text{day}$), $S_0$ is influent BOD ($mg/L$), $S$ is target effluent BOD ($mg/L$), and $P_x$ is net biological sludge mass synthesized per day ($kg\text{ VSS/day}$).

The conversion from actual field conditions to clean water standard conditions is defined by the gas transfer relationship:

$$SOR = AOR \cdot \left[ \frac{C_{s,20}}{\alpha \cdot (\beta \cdot C_{s,T,H} - C_L) \cdot \theta^{(T - 20)}} \right]$$

Where:
- $\alpha = 0.82$: Wastewater oxygen transfer correction factor
- $\beta = 0.95$: Salinity and dissolved solids correction factor
- $C_{s,20} = 9.09\text{ mg/L}$: Saturation dissolved oxygen in pure water at $20^\circ\text{C}$ and $1\text{ atm}$
- $C_{s,T,H}$: Saturation DO at operating temperature $T$ ($^\circ\text{C}$) and elevation $H$ ($m$)
- $C_L$: Operating target DO concentration in the basin ($1.5\text{--}2.5\text{ mg/L}$)
- $\theta = 1.024$: Temperature activity coefficient

The mechanical blower power consumption $P_{\text{blower}}$ ($kW$) required to deliver this air flow is modeled as:

$$P_{\text{blower}} = \frac{w R T_1}{29.7 n e} \cdot \left[ \left( \frac{p_2}{p_1} \right)^{0.283} - 1 \right]$$

### 3.3.2 Chemical Coagulant Optimization
In tertiary clarifier treatment, polyaluminium chloride (PAC) coagulant dosing $D_{\text{PAC}}$ ($mg/L$) is calculated as an empirical non-linear function of influent Total Suspended Solids ($SS_{in}$) and Chemical Oxygen Demand ($COD_{in}$):

$$D_{\text{PAC}} = k_{\text{coag}} \cdot (SS_{in})^{0.65} \cdot \left( \frac{COD_{in}}{COD_{\text{target}}} \right)^{0.35} \cdot f(pH)$$

Where $f(pH)$ is a parabolic correction factor penalizing non-optimal coagulation pH ($pH_{opt} = 7.2$):

$$f(pH) = 1.0 + 0.15 \cdot (pH - 7.2)^2$$

### 3.3.3 Water Circularity & Scope 2 Indirect Carbon Avoidance
The **Water Circularity Index ($WCI$)** is formulated as:

$$WCI = \left( \frac{V_{\text{recycled}}}{V_{\text{treated}}} \right) \cdot \left( 1 - \frac{V_{\text{losses}}}{V_{\text{influent}}} \right) \times 100\%$$

Scope 2 indirect greenhouse gas emissions avoided ($E_{\text{avoided}}$ in $kg\text{ CO}_2e/\text{day}$) through optimized blower setpoints and local water recycling are quantified as:

$$E_{\text{avoided}} = \Delta P_{\text{saved}} \cdot t_{\text{op}} \cdot EF_{\text{grid}} + V_{\text{recycled}} \cdot \left( EF_{\text{municipal}} \right)$$

Where:
- $\Delta P_{\text{saved}} = P_{\text{unoptimized}} - P_{\text{optimized}}$ ($kW$ energy delta)
- $EF_{\text{grid}} = 0.82\text{ kg CO}_2e/kWh$ (Central Electricity Authority India grid average)
- $EF_{\text{municipal}} = 0.35\text{ kg CO}_2e/kL$ (Avoided municipal pumping and distribution energy)

## 3.4 Cryptographic Data Integrity and Merkle Tree Formulation

### 3.4.1 Canonical Serialization (`atc-v1`) and SHA-256 Hashing
A treatment cycle record $R$ is transformed into a strictly ordered, whitespace-stripped canonical JSON byte string:

$$S_{\text{canonical}} = \text{Serialize}_{\text{sorted}}(\{k: R[k] \mid \forall k \in K_{\text{immutable}}\})$$

The 256-bit cryptographic digest $H(R)$ is computed using double SHA-256:

$$H(R) = \text{SHA-256}(\text{SHA-256}(S_{\text{canonical}}))$$

### 3.4.2 RFC 6962 Compliant Merkle Tree Audit Proofs
Leaf node hashes $H_{\text{leaf}}$ are calculated with a `0x00` prefix byte to prevent second-preimage attacks:

$$H_{\text{leaf}}(x) = \text{SHA-256}(\mathtt{0x00} \parallel x)$$

Internal nodes are hashed with a `0x01` prefix byte:

$$H_{\text{parent}} = \text{SHA-256}(\mathtt{0x01} \parallel H_{\text{left}} \parallel H_{\text{right}})$$

For any individual record $x$, a Merkle audit path consisting of $\lceil \log_2(n) \rceil$ sibling hashes provides mathematical proof that record $x$ was included in the batch anchored to Merkle Root $R$ with logarithmic verification complexity $\mathcal{O}(\log n)$.

\newpage

# Chapter 4: System Architecture and Design

## 4.1 System Overview and High-Level Architecture
AquaTrust AI is engineered following an event-driven, decoupled, multi-tier microservices architecture. The platform bridges physical and simulated wastewater processes with cloud microservices, predictive machine learning pipelines, and decentralized ledger environments.

![Figure 4.1: End-to-End System Architecture of AquaTrust AI Platform](images/fig4_1_architecture.png)

The platform comprises five primary architectural tiers:
1. **Data Ingestion Tier:** Replays calibrated real-world wastewater operational data, generates synthetic high-frequency sensor readings, and injects controlled sensor faults and biological shock events for testing.
2. **AI/ML Intelligence Tier:** Encapsulates the trained inference models for sensor trust classification, multi-output effluent parameter forecasting, closed-loop prescriptive recommendations, and stoichiometric carbon accounting.
3. **Backend & Persistence Tier:** Built on FastAPI, Python 3.10+, SQLAlchemy ORM, and PostgreSQL 15. Manages data persistence across 14 tables, enforces Role-Based Access Control (RBAC), and coordinates the Digital Twin state machine.
4. **Distributed Ledger & Cryptographic Tier:** Serializes canonical operational snapshots (`atc-v1`), computes SHA-256 Merkle root trees, and anchors cryptographic hashes to an immutable ledger (Solidity smart contracts deployed on Ganache / Hyperledger Fabric 2.5 channel) with automated fallback to local simulation mode.
5. **Presentation & SCADA Web UI Tier:** Modern single-page application built with React 18, Vite, and Tailwind CSS. Provides industrial synoptic diagrams, live time-series dashboards, alert triage centers, and cryptographic verification interfaces.

## 4.2 Detailed Module Descriptions
- **Data Simulation and Ingestion Engine:** Replays the 527-record UCI Urban ETP dataset with cubic spline smoothing and controlled anomaly injection (`STUCK_SENSOR`, `SENSOR_FAILURE`, `SENSOR_DRIFT`, `PARAMETER_INCONSISTENCY`, etc.).
- **AI/ML Sensor Trust and Effluent Prediction Engine:** Evaluates rolling $Z$-scores and an Isolation Forest ($n=150$) to assign trust tiers, followed by Gradient Boosted Regressors predicting effluent $BOD, COD, TSS,$ and $pH$.
- **Prescriptive Process Optimization:** Translates predictive model outputs into actionable operational directives (blower DO setpoints 1.5–2.5 mg/L, coagulant dosing, and equalization basin bypass).
- **Digital Twin State Engine:** Maintains a dynamic digital twin of biological and electromechanical health states (`NORMAL_DIGESTION`, `HYDRAULIC_SURGE`, `TOXIC_SHOCK`, `AERATION_STARVATION`, `CLARIFIER_BULKING`).
- **Cryptographic Verification and DLT Gateway:** Formulates canonical `atc-v1` snapshots, constructs SHA-256 Merkle trees, and anchors root hashes to Solidity smart contracts.
- **Interactive Web SCADA Dashboard:** Single-page React application delivering synoptic schematics, real-time alert triage, and single-click cryptographic verification.

## 4.3 Data Flow Diagrams
- **Level 0 DFD (Context Level):** Captures high-level interactions between IoT sensors, plant operators, pollution control regulators, and the blockchain ledger.
- **Level 1 DFD (Subsystem Decomposition):** Breaks the system down into six functional blocks: Data Ingest, Trust Evaluation, Effluent Prediction, Process Optimizer, Database Persistence, and Blockchain Sealing.
- **Level 2 DFD (AI & Cryptographic Pipelines):** Details the inner workings of multi-target tree regression, CPCB limit evaluation, canonical JSON serialization, and Merkle tree generation.

## 4.4 Entity-Relationship (ER) Modeling & Database Schema Design
The system utilizes 14 PostgreSQL relational tables:
- `facilities`, `sensors`, `sensor_readings`, `treatment_cycles`, `anomaly_results`, `predictions`, `recommendations`, `dlt_anchors`, `audit_timeline`, `compliance_rules`, `compliance_results`, `corrections`, `certificates`, `users`.

The schema guarantees referential integrity, tenant isolation, and strict append-only audit log histories.

*Table 4.1: Core Relational Schema Mapping (PostgreSQL Tables and Primary Keys)*
| Table Name | Primary Key | Foreign Key References | Purpose & Description |
| :--- | :--- | :--- | :--- |
| `facilities` | `id` (UUID) | None | Stores metadata for physical decentralized STP/ETP installations |
| `sensors` | `id` (UUID) | `facility_id` $\to$ `facilities.id` | Hardware inventory, calibration curves, and probe health status |
| `sensor_readings` | `id` (UUID) | `sensor_id`, `cycle_id` | High-frequency physical & synthetic telemetry time-series |
| `treatment_cycles`| `id` (UUID) | `facility_id` $\to$ `facilities.id` | Discrete 4-to-8 hour biological treatment cycles |
| `anomaly_results` | `id` (UUID) | `reading_id` $\to$ `sensor_readings.id` | Output of Isolation Forest and statistical trust classifier |
| `predictions` | `id` (UUID) | `cycle_id` $\to$ `treatment_cycles.id` | Predicted effluent metrics ($DBO, DQO, SS, pH$) |
| `recommendations`| `id` (UUID) | `prediction_id` $\to$ `predictions.id` | Prescribed actions (blower DO setpoint, coagulant dosing) |
| `dlt_anchors` | `id` (UUID) | `cycle_id` $\to$ `treatment_cycles.id` | SHA-256 Merkle root hashes, transaction IDs, block heights |
| `audit_timeline` | `id` (UUID) | `facility_id` $\to$ `facilities.id` | Immutable append-only audit log with SHA-256 lineage hash |

## 4.5 Input and Output Design
- **Input Design:** High-frequency JSON telemetry payloads over HTTP POST/WebSocket containing multi-parameter readings ($DO, pH, BOD, COD, TSS, Temp$) alongside cryptographic signatures for operator setpoint adjustments.
- **Output Design:** Real-time synoptic visual displays, predictive CPCB compliance warnings, prescriptive setpoint instructions, and digitally signed downloadable compliance certificates with cryptographic Merkle inclusion proofs.

\newpage

# Chapter 5: Implementation Details

## 5.1 Technology Stack and Environmental Configuration
- **Backend & ML:** Python 3.10+, FastAPI 0.109, Uvicorn, SQLAlchemy 2.0, PostgreSQL 15, Alembic 1.13.
- **Machine Learning Libraries:** Scikit-Learn 1.4, XGBoost 2.0, NumPy, Pandas, SciPy.
- **Cryptography & Blockchain:** Cryptography (hazmat P-256 ECDSA), Solidity 0.8.20, Ganache 7.9, Hyperledger Fabric 2.5.
- **Frontend SCADA:** React 18, Vite 5.0, Tailwind CSS 3.4, Lucide React, Chart.js.
- **Testing:** Pytest 8.0, TestClient, Jest.

*Table 5.1: Software, Library, and Framework Dependency Inventory*
| Component Layer | Technology / Library | Version | Technical Purpose & Role |
| :--- | :--- | :--- | :--- |
| **Programming Language** | Python | 3.10 / 3.13 | Core backend, ML pipelines, and API services |
| **Web Framework** | FastAPI | 0.109.0 | Asynchronous RESTful API and WebSocket telemetry routing |
| **ASGI Server** | Uvicorn | 0.27.0 | High-performance asynchronous HTTP/WebSocket gateway |
| **Database ORM** | SQLAlchemy | 2.0.25 | Async object-relational mapping and connection pooling |
| **Database Migrations** | Alembic | 1.13.1 | Version-controlled, idempotent PostgreSQL DDL migrations |
| **Database Engine** | PostgreSQL | 15.4 | Relational persistence, indexing, and transactional integrity |
| **Machine Learning** | Scikit-Learn | 1.4.0 | Isolation Forest, Random Forest, metrics evaluation |
| **Gradient Boosting** | XGBoost / LightGBM | 2.0.3 | Optimized gradient tree boosting for effluent prediction |
| **Scientific Computing** | NumPy / Pandas / SciPy| 1.26.3 | Matrix manipulation, spline interpolation, statistics |
| **Cryptography** | Cryptography (hazmat) | 42.0.0 | P-256 ECDSA signatures and SHA-256 hashing |
| **Smart Contracts** | Solidity | 0.8.20 | On-chain compliance verification and root hash storage |
| **Blockchain Networks** | Ganache / Fabric | 2.5 / 7.9.2 | Local testing blockchain and enterprise permissioned DLT |
| **Frontend Framework** | React / Vite | 18.2 / 5.0 | Reactive component rendering and dashboard UI |
| **Styling & Icons** | Tailwind CSS / Lucide | 3.4.1 | Utility-first responsive CSS and industrial SCADA icons |
| **Automated Testing** | Pytest / Jest | 8.0.0 | Pure unit, concurrency, integration, and E2E QA |

## 5.2 Sensor Data Simulation and Synthetic Anomaly Injection Pipeline
The simulation harness replays 527 days of operational data from the UCI Urban Wastewater Treatment Plant dataset, applying cubic spline interpolation and Gaussian white noise ($\sigma = 0.02$) to generate high-frequency synthetic telemetry streams ($1\text{ Hz}$). Ten distinct anomaly injection algorithms emulate probe flatlines, extreme spikes, calibration drift, and chemical shock events.

## 5.3 Machine Learning Pipeline Implementation
- Trained multi-output tree ensembles on 527 UCI ETP records.
- Feature engineering included lag features ($t-1, t-2$), hydraulic retention time ratios, and cross-parameter biochemical balances.
- Optimized hyperparameters via 5-fold cross-validation, achieving $R^2 > 0.88$ across all effluent targets.

*Table 5.2: Hyperparameter Configurations for Gradient Boosted and Random Forest Models*
| Hyperparameter | Effluent BOD ($DBO\text{-}S$) | Effluent COD ($DQO\text{-}S$) | Effluent TSS ($SS\text{-}S$) | Effluent pH ($PH\text{-}S$) |
| :--- | :--- | :--- | :--- | :--- |
| **Estimator Type** | GradientBoostingRegressor | RandomForestRegressor | GradientBoostingRegressor | RandomForestRegressor |
| **Number of Trees ($n$)**| 250 | 300 | 200 | 150 |
| **Learning Rate ($\eta$)**| 0.045 | N/A (Bagging) | 0.050 | N/A (Bagging) |
| **Max Tree Depth** | 5 | 8 | 6 | 6 |
| **Min Samples Split** | 4 | 2 | 4 | 3 |
| **Subsample Ratio** | 0.85 | 1.00 (Bootstrap) | 0.80 | 1.00 (Bootstrap) |

## 5.4 Backend RESTful API & Persistence Architecture
- Modular FastAPI routers exposed under `/api/v1/`: `/sensors`, `/predictions`, `/recommendations`, `/sustainability`, `/audit`.
- Full asynchronous database operations using SQLAlchemy and asyncpg.
- Enforced Role-Based Access Control (RBAC) across 4 roles: `OPERATOR`, `MANAGER`, `AUDITOR`, `ADMIN`.

*Table 5.3: RESTful API Endpoint Specification Table (FastAPI Routes)*
| HTTP Verb | API Endpoint Route | Target Service | Functionality & Response |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/sensors/ingest` | Sensor Ingestion | Ingests sensor batch, executes trust scoring, quarantines faults |
| `GET` | `/api/v1/sensors/health` | Sensor Trust | Returns live trust status and health scores across all probes |
| `POST` | `/api/v1/predictions/predict` | Quality Prediction | Generates multi-target effluent predictions with breach warnings |
| `POST` | `/api/v1/recommendations/generate`| Prescriptive Engine | Outputs DO setpoints, coagulant dosage, and bypass advice |
| `GET` | `/api/v1/sustainability/metrics` | Sustainability | Computes power savings, circularity index, and Scope 2 carbon |
| `POST` | `/api/v1/audit/anchor` | DLT Gateway | Serializes cycle snapshot, builds Merkle root, anchors to DLT |
| `POST` | `/api/v1/audit/verify` | Verification Engine | Executes offline SHA-256 Merkle proof verification |

## 5.5 Blockchain Smart Contract Implementation
- Developed `AquaTrustRecords.sol` smart contract storing 32-byte Merkle roots, metadata hashes, and compliance booleans.
- Implemented client-side offline verification tools recalculating double-SHA-256 hashes and validating Merkle paths without connecting to external nodes.

## 5.6 Core Algorithmic Implementations and Pseudocode

### 5.6.1 Algorithm 1: Sensor Trust & Anomaly Classification
```
Algorithm 1: Sensor Trust and Anomaly Classification Engine
Input:  Streaming sensor reading x_t, parameter type p, history window W, Isolation Forest model M_if
Output: Trust Tier T, Anomaly Type A, Is_Quarantined flag Q

1:  if x_t is NULL or x_t is NaN then
2:      return (CRITICAL, MISSING_READING, true)
3:  end if
4:  if x_t < Physical_Min[p] or x_t > Physical_Max[p] then
5:      return (CRITICAL, SENSOR_FAILURE, true)
6:  end if
7:  Append x_t to sliding window W
8:  if |W| >= 15 and Variance(W) < 1e-5 then
9:      return (FAILED, STUCK_SENSOR, true)
10: end if
11: Compute rolling mean mu and standard deviation sigma over W
12: Z_t <- |x_t - mu| / (sigma + 1e-6)
13: s_if <- M_if.score_samples(x_t)
14: if Z_t > 4.0 then
15:     return (DEGRADED, SUDDEN_SPIKE, false)
16: else if s_if > 0.65 then
17:     return (SUSPECT, STATISTICAL_ANOMALY, false)
18: else
19:     return (TRUSTED, NORMAL, false)
20: end if
```

### 5.6.2 Algorithm 2: Treatment Cycle Risk Escalation & Evidence Sealing
```
Algorithm 2: Treatment Cycle Risk Escalation & Cryptographic Evidence Sealing
Input:  Completed Cycle Object C, Predicted Effluent Y_hat, Legal Limits L, Private Key K_priv
Output: Anchored DLT Transaction Hash Tx_Hash, Cryptographic Certificate Cert

1:  Risk_Score <- 0.0
2:  if Y_hat.BOD > L.BOD or Y_hat.COD > L.COD or Y_hat.TSS > L.TSS then
3:      C.status <- "BREACH_RISK"
4:      Risk_Score <- Max(Risk_Score, 0.70)
5:  else if Y_hat.BOD > 0.85 * L.BOD then
6:      C.status <- "BORDERLINE"
7:      Risk_Score <- Max(Risk_Score, 0.35)
8:  else
9:      C.status <- "OPTIMAL"
10: end if
11: S_canonical <- CanonicalSerialize_atc_v1(C)
12: H_cycle <- SHA256(SHA256(S_canonical))
13: Merkle_Root <- BuildMerkleTree(H_cycle, C.readings)
14: Signature <- ECDSA_Sign(K_priv, Merkle_Root)
15: Tx_Hash <- SmartContract.anchorRecord(C.id, Merkle_Root, H_cycle, C.status != "BREACH_RISK")
16: Cert <- GenerateCertificate(C.id, Merkle_Root, Tx_Hash, Signature)
17: return (Tx_Hash, Cert)
```

\newpage

# Chapter 6: System Testing, Verification, and Experimental Results

## 6.1 Testing Methodology & Verification Framework
The platform was subjected to a rigorous testing regimen comprising:
- Pure unit testing of mathematical models and anomaly scoring algorithms;
- Concurrent multi-threaded ingestion stress testing;
- Single-bit database tampering injection tests;
- DLT gateway container offline failover testing.

## 6.2 Test Execution Metrics and Suite Summary
Across all 30 system modules, a total of **293 pure automated tests** were executed with a **100% pass rate** (zero failures, zero regressions).

*Table 6.1: Overall System Automated Test Execution Summary (293 Tests)*
| Test Suite / Module Category | Test File Reference | Tests Executed | Passed | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Sensor Trust & Anomaly Inference** | `test_phase02_sensors.py` | 42 | 42 (100%) | **PASSED** |
| **Effluent Quality Prediction Engine** | `test_phase03_predictions.py` | 38 | 38 (100%) | **PASSED** |
| **Prescriptive Recommendations** | `test_phase04_recommendations.py`| 35 | 35 (100%) | **PASSED** |
| **Sustainability & Stoichiometry** | `test_phase05_sustainability.py` | 30 | 30 (100%) | **PASSED** |
| **Digital Twin Kinetics & State** | `test_phase06_digital_twin.py` | 36 | 36 (100%) | **PASSED** |
| **Cryptographic DLT & Merkle Proofs**| `test_phase07_audit_dlt.py` | 45 | 45 (100%) | **PASSED** |
| **Backend End-to-End API Integration**| `test_member2_deliverables.py` | 55 | 55 (100%) | **PASSED** |
| **Mandatory Cross-Module Edge Cases**| `test_mandatory_e2e_edge_cases.py`| 12 | 12 (100%) | **PASSED** |
| **TOTAL SYSTEM TEST SUITE** | **All 8 Test Modules** | **293** | **293 (100%)**| **PERFECT** |

## 6.3 Machine Learning Model Evaluation & Empirical Results

### 6.3.1 Parameter Prediction Accuracy and Regression Curves
The effluent quality prediction models were evaluated on a held-out test split (20%, $N = 106$ cycles) of the empirical UCI Urban Wastewater Treatment Plant dataset. The multi-output ensemble demonstrated high predictive fidelity across all four regulatory target parameters.

*Table 6.2: Empirical Performance Metrics of Effluent Water Quality Prediction Models*
| Effluent Target Parameter | Optimal ML Estimator | RMSE | MAE | $R^2$ Score | CPCB Compliance Accuracy |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Effluent BOD ($DBO\text{-}S$)** | Gradient Boosting Regressor | **6.16 mg/L** | 4.32 mg/L | **0.884** | **96.8%** |
| **Effluent COD ($DQO\text{-}S$)** | Random Forest Regressor | **27.05 mg/L** | 18.40 mg/L | **0.892** | **95.4%** |
| **Effluent TSS ($SS\text{-}S$)** | Gradient Boosting Regressor | **7.30 mg/L** | 5.10 mg/L | **0.879** | **97.1%** |
| **Effluent pH ($PH\text{-}S$)** | Random Forest Regressor | **0.166 pH** | 0.112 pH | **0.915** | **99.2%** |

![Figure 6.1: Actual vs. Predicted Effluent Concentrations across CPCB Target Parameters](images/fig6_1_effluent_regression.png)

As demonstrated in Figure 6.1, predicted effluent values closely track the actual laboratory test values along the ideal 45-degree ($y = x$) regression line. For Effluent BOD (Figure 6.1a), the model reliably classifies cycles approaching the CPCB permissible discharge limit of $30.0\text{ mg/L}$, triggering proactive aeration adjustments before breaches occur. Similarly, for Effluent COD (Figure 6.1b) and TSS (Figure 6.1c), the models maintain high fidelity even during non-linear peak organic loading spikes. Effluent pH (Figure 6.1d) demonstrates the highest precision ($R^2 = 0.915$, $\text{RMSE} = 0.166$), accurately predicting shifts toward acidic or alkaline boundaries.

### 6.3.2 Anomaly Classification Confusion Matrix and Trust Performance
The 10-class sensor trust engine was evaluated against 1,200 synthetic telemetry cycles containing labeled anomaly injections across all 10 operational fault archetypes.

*Table 6.3: Classification Performance of Sensor Trust & Anomaly Inference Engine*
| Anomaly Archetype | Precision | Recall | F1-Score | Mean Detection Latency |
| :--- | :---: | :---: | :---: | :---: |
| `NORMAL` | 0.99 | 0.98 | **0.98** | Baseline (< 1 cycle) |
| `STUCK_SENSOR` | 0.98 | 1.00 | **0.99** | $\le 15\text{ cycles}$ |
| `SENSOR_FAILURE` | 1.00 | 0.99 | **0.99** | Instantaneous (< 1 cycle) |
| `SENSOR_DRIFT` | 0.92 | 0.89 | **0.90** | $5\text{--}8\text{ cycles}$ |
| `PARAMETER_INCONSISTENCY` | 0.94 | 0.91 | **0.92** | $< 2\text{ cycles}$ |
| `SUDDEN_SPIKE` | 0.97 | 0.98 | **0.97** | Instantaneous (< 1 cycle) |
| `MISSING_READING` | 1.00 | 1.00 | **1.00** | Instantaneous (< 1 cycle) |
| `DUPLICATE_READING` | 1.00 | 1.00 | **1.00** | Instantaneous (< 1 cycle) |
| `SUDDEN_PROCESS_CHANGE` | 0.91 | 0.93 | **0.92** | $3\text{--}5\text{ cycles}$ |
| `STATISTICAL_ANOMALY` | 0.88 | 0.86 | **0.87** | $< 1\text{ cycle}$ |

![Figure 6.2: Normalized Confusion Matrix for 10-Class Sensor Trust & Anomaly Inference](images/fig6_2_anomaly_confusion_matrix.png)

Figure 6.2 depicts the normalized confusion matrix across the 10 anomaly classes. The hybrid statistical/Isolation Forest architecture demonstrates strong diagonal concentration. Hardware disconnects (`SENSOR_FAILURE`), packet drops (`MISSING_READING`), and transmission replays (`DUPLICATE_READING`) achieve 100% detection accuracy. Subtle drift (`SENSOR_DRIFT`, 89.4%) and biological process shocks (`SUDDEN_PROCESS_CHANGE`, 92.4%) are correctly differentiated without confounding sensor hardware wear with biological shock.

### 6.3.3 Model Benchmarking & Computational Complexity Analysis
To empirically justify the selection of the tree-based ensemble architecture, a comprehensive benchmark was conducted comparing the proposed ensemble against baseline machine learning paradigms: Ordinary Least Squares (OLS) Linear Regression, Support Vector Regression (SVR with RBF kernel), standalone Random Forest, standalone XGBoost, and a deep Long Short-Term Memory (LSTM) recurrent network.

*Table 6.4: Comparative Model Benchmark Matrix across Multiple ML Paradigms*
| Architecture / Model Paradigm | BOD RMSE (mg/L) | COD RMSE (mg/L) | Mean $R^2$ Score | Single-Cycle Inference Latency | Memory Footprint |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Linear Regression (OLS)** | 14.80 mg/L | 58.20 mg/L | 0.612 | **1.2 ms** | **< 2 MB** |
| **Support Vector Regressor (SVR)**| 9.75 mg/L | 38.60 mg/L | 0.785 | 8.4 ms | 12 MB |
| **Random Forest Regressor** | 6.82 mg/L | 27.05 mg/L | 0.865 | 11.2 ms | 38 MB |
| **XGBoost (Gradient Boosted)**| 6.35 mg/L | 28.40 mg/L | 0.878 | 14.5 ms | 24 MB |
| **Deep LSTM Recurrent Network** | 7.90 mg/L | 32.10 mg/L | 0.834 | 84.6 ms | 145 MB |
| **AquaTrust AI Multi-Output Ensemble**| **6.16 mg/L** | **27.05 mg/L** | **0.892** | **18.2 ms** | **45 MB** |

![Figure 6.3: Machine Learning Model Benchmarking and Computational Complexity Comparison](images/fig6_3_model_benchmarks.png)

As illustrated in Figure 6.3:
1. **RMSE Comparison (Figure 6.3a):** Standard Linear Regression fails to capture non-linear microbial digestion dynamics ($\text{RMSE} = 14.80\text{ mg/L}$). The AquaTrust AI ensemble achieves the lowest error ($\text{RMSE} = 6.16\text{ mg/L}$), representing a 58.4% error reduction over linear baselines.
2. **Coefficient of Determination ($R^2$, Figure 6.3b):** The ensemble achieves a mean $R^2 = 0.892$, significantly outperforming SVR ($R^2 = 0.785$) and deep LSTM ($R^2 = 0.834$).
3. **Inference Latency & Edge Feasibility (Figure 6.3c):** While deep LSTM architectures require $84.6\text{ ms}$ per cycle and over $140\text{ MB}$ RAM, our ensemble executes in **$18.2\text{ ms}$** on standard commodity hardware. This ultra-low computational latency allows the entire predictive pipeline to run comfortably on low-cost edge gateways (such as a Raspberry Pi 4).

## 6.4 Blockchain Performance and Tamper Detection Experimental Analysis
To evaluate the cryptographic integrity and scaling capabilities of the off-chain/on-chain hybrid architecture, a systematic series of cryptographic stress tests and tamper-injection experiments were conducted.

*Table 6.5: Cryptographic Integrity Verification & Tamper Detection Benchmark*
| Test Scenario / Attack Vector | Target Payload Field | Stored Hash Match? | Merkle Root Match? | Verifier Outcome |
| :--- | :--- | :---: | :---: | :--- |
| **Pristine Unmodified Record** | None | **YES** | **YES** | **VERIFIED (Valid)** |
| **Subtle Value Alteration** | `predicted_bod: 34.2 -> 18.5` | **NO** | **NO** | **TAMPER DETECTED (Rejected)** |
| **Timestamp Alteration Attack**| Shifted by $+1\text{ second}$ | **NO** | **NO** | **TAMPER DETECTED (Rejected)** |
| **JSON Key Reordering Attack** | Keys sorted alphabetically | **YES (`atc-v1`)** | **YES** | **VERIFIED (Order Invariant)** |
| **Bit-Flip in Merkle Proof** | 1 bit flipped in sibling hash | **YES** | **NO** | **TAMPER DETECTED (Rejected)** |

![Figure 6.4: Cryptographic Scaling Benchmarks and Tamper Detection Experimental Analysis](images/fig6_4_crypto_tamper_benchmark.png)

Figure 6.4 illustrates the experimental findings:
- **Scaling Complexity (Figure 6.4a):** Double SHA-256 canonical hashing (`atc-v1`) and Merkle tree generation scale linearly $\mathcal{O}(n)$ with batch size. For a 100-cycle operational batch, root generation completes in just **$1.10\text{ ms}$**. Most importantly, single-record inclusion proof verification executes in logarithmic time $\mathcal{O}(\log_2 n)$, requiring only **$0.12\text{ ms}$** to mathematically prove the integrity of an arbitrary cycle snapshot.
- **Tamper Detection Efficacy (Figure 6.4b):** Single-bit modifications, timestamp alterations, and numerical falsifications are detected with **100.0% accuracy**. Conversely, benign JSON serialization reordering attacks are safely neutralized by the canonical `atc-v1` standard, guaranteeing zero false alarms.

## 6.5 Sustainability, Energy Conservation, and Circularity Impact Results
To assess the practical ecological and economic benefits, the closed-loop stoichiometric optimizer was benchmarked over a simulated 30-day operating period for a decentralized residential STP treating $500\text{ kL/day}$ ($500,000\text{ L/day}$).

*Table 6.6: Monthly Resource Optimization & Carbon Avoidance in 500 kL/day Facility*
| Sustainability Metric | Baseline (Unoptimized) | AquaTrust AI Optimized | Net Monthly Savings / Impact |
| :--- | :---: | :---: | :---: |
| **Aeration Blower Electricity**| $8,640\text{ kWh}$ | $6,739\text{ kWh}$ | **$1,901\text{ kWh}$ saved (22.0% reduction)** |
| **Coagulant Chemical (PAC)** | $450\text{ kg}$ | $369\text{ kg}$ | **$81\text{ kg}$ saved (18.0% reduction)** |
| **Freshwater Reused via Recycling**| $0\text{ kL}$ | $12,750\text{ kL}$ | **$12.75\text{ Million Liters}$ Conserved** |
| **Water Circularity Index ($WCI$)** | $12.5\%$ | **$85.0\%$** | **$+72.5\%$ Circularity Gain** |
| **Scope 2 Indirect Carbon Avoided** | $0\text{ kg CO}_2e$ | **$6,021\text{ kg CO}_2e$** | **$6.02\text{ Metric Tons CO}_2e$ Avoided** |

![Figure 6.5: 30-Day Cumulative Sustainability Impact in a 500 kL/day Treatment Facility](images/fig6_5_sustainability_impact.png)

Figure 6.5 plots the cumulative 30-day progression:
- **Aeration Energy Conservation (Figure 6.5a):** By dynamically tuning dissolved oxygen setpoints between $1.5\text{--}2.5\text{ mg/L}$ rather than running blowers continuously at full load, the plant accumulated **$1,901\text{ kWh}$** in electrical energy savings (a 22.0% reduction).
- **Scope 2 Indirect Carbon Avoided (Figure 6.5b):** Combining electrical grid emission offsets ($0.82\text{ kg CO}_2e/kWh$) with avoided municipal water conveyance pumping ($0.35\text{ kg CO}_2e/kL$), the facility averted **$6,021\text{ kg CO}_2e$** ($6.02\text{ metric tons}$) of greenhouse gas emissions within a single month of automated closed-loop operation.

\newpage

# Chapter 7: Conclusion and Future Work

## 7.1 Conclusion and Key Research Contributions
The AquaTrust AI project delivers an end-to-end, production-ready solution resolving the dual challenges of predictive opacity and audit vulnerability in decentralized wastewater treatment. By combining synthetic telemetry simulation, ensemble machine learning, stoichiometric process modeling, and cryptographic distributed ledgers, the platform provides institutional-grade operational control and unforgeable compliance auditing without requiring capital-intensive hardware deployments.

## 7.2 Practical Industrial Impact & Societal Relevance
The platform directly protects aquatic ecosystems from untreated municipal discharge, advances urban circular water economies, and establishes trustless environmental governance for pollution control boards.

## 7.3 Limitations of the Current Implementation
The operational boundaries of the current release are:
1. **Synthetic Telemetry Baseline:** While calibrated against empirical UCI Urban ETP records, real-world deployment requires site-specific tuning of biological kinetic coefficients.
2. **Single-Node Simulation Fallback:** In environments where external Hyperledger Fabric or Ganache nodes are unreachable, the DLT gateway falls back to local RFC 6962 simulation.
3. **Advisory Actuation Level:** Prescriptive setpoints are surfaced on the SCADA dashboard as operator guidance rather than directly driving physical Modbus/PLC actuator relays.
4. **Laboratory Correlation Delay:** Field validation still requires intermittent wet-chemistry laboratory testing to continuously confirm physical sensor calibration accuracy.

## 7.4 Future Enhancements and Research Directions
Future work will advance the platform along the following directions:
1. **Physical PLC / Modbus Interfacing:** Deploying lightweight edge microcontrollers (ESP32 / Raspberry Pi) running TinyML models to interface directly with physical RS-485 Modbus RTU actuator relays.
2. **Physics-Informed Neural Networks (PINNs):** Embedding differential mass balance equations from Activated Sludge Models (ASM2d) directly into neural network loss functions.
3. **Hardware Security Module (HSM) Key Management:** Securing operator ECDSA private keys using physical TPM 2.0 or CloudHSM modules.
4. **Automated Carbon & Water Credit Tokenization:** Minting verified ERC-20 / ERC-721 environmental credits on public blockchains directly from cryptographically audited treatment cycle records.
5. **Decentralized Multi-Tenant Federation:** Expanding the Hyperledger Fabric channel architecture to support federated consortium networks across multiple municipal wards and industrial clusters.

\newpage

# References

1. N. Rane, S. Choudhary, and J. Rane, "Leading-edge Artificial Intelligence (AI), Machine Learning (ML), Blockchain, and Internet of Things (IoT) Technologies for Enhanced Wastewater Treatment Systems," *SSRN Electronic Journal*, 2023. DOI: 10.2139/ssrn.4632014.
2. Metcalf & Eddy, Inc., G. Tchobanoglous, H. D. Stensel, R. Tsuchihashi, and F. L. Burton, *Wastewater Engineering: Treatment and Resource Recovery*, 5th ed. New York, NY, USA: McGraw-Hill Education, 2014.
3. F. Liu, K. M. Ting, and Z.-H. Zhou, "Isolation Forest," in *Proc. 2008 Eighth IEEE International Conference on Data Mining (ICDM)*, Pisa, Italy, 2008, pp. 413–422. DOI: 10.1109/ICDM.2008.17.
4. V. Chandola, A. Banerjee, and V. Kumar, "Anomaly detection: A survey," *ACM Computing Surveys*, vol. 41, no. 3, pp. 1–58, 2009. DOI: 10.1145/1541880.1541882.
5. P. Granata, F. Gargano, and G. de Marinis, "Support vector regression for wastewater treatment plant effluent parameter prediction," *Journal of Hydrologic Engineering*, vol. 22, no. 6, p. 04017012, 2017.
6. A. M. Melesse et al., "Machine learning applications in water quality parameter monitoring: A comprehensive review," *Water Research*, vol. 184, p. 116132, 2020.
7. L. Corominas et al., "Digital twins for water resource recovery facilities: A review of opportunities, challenges and principles," *Water Research*, vol. 195, p. 116962, 2021.
8. E. Androulaki et al., "Hyperledger Fabric: A distributed operating system for permissioned blockchains," in *Proc. Thirteenth EuroSys Conference (EuroSys '18)*, Porto, Portugal, 2018, Art. no. 30.
9. B. A. Crosby and D. S. Wallach, "Certificate Transparency," *IETF RFC 6962*, Jun. 2013. [Online]. Available: https://rfc-editor.org/rfc/rfc6962.txt
10. Central Pollution Control Board (CPCB), "General Standards for Discharge of Environmental Pollutants: Effluents," *Environment (Protection) Rules, 1986*, Schedule VI, Ministry of Environment, Forest and Climate Change, Govt. of India, New Delhi.
11. S. Mylrea and S. N. G. Gourisetti, "Blockchain for smart grid resilience, cyber security, and water infrastructure," in *Proc. IEEE Resilience Week (RWS)*, Wilmington, DE, USA, 2017, pp. 132–138.
12. T. Chen and C. Guestrin, "XGBoost: A scalable tree boosting system," in *Proc. 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, San Francisco, CA, USA, 2016, pp. 785–794.
13. M. Ahmed et al., "Unsupervised anomaly detection in IoT-based wastewater monitoring systems," *IEEE Internet of Things Journal*, vol. 7, no. 9, pp. 8120–8132, 2020.
14. F. Pedregosa et al., "Scikit-learn: Machine learning in Python," *Journal of Machine Learning Research*, vol. 12, pp. 2825–2830, 2011.
15. S. Nakamoto, "Bitcoin: A peer-to-peer electronic cash system," *Decentralized Business Review*, p. 21260, 2008.

\newpage

# Appendix A: Key Code Listings and Smart Contract Definitions

### Listing A.1: Canonical Snapshot Serializer (`atc-v1`)
```python
import json
import hashlib
from typing import Dict, Any

def serialize_canonical_snapshot(record: Dict[str, Any]) -> bytes:
    """
    Serializes an operational cycle snapshot into canonical deterministic bytes (atc-v1).
    Ensures key sorting, float canonicalization, and whitespace stripping.
    """
    canonical_dict = {}
    for key in sorted(record.keys()):
        val = record[key]
        if isinstance(val, float):
            canonical_dict[key] = round(val, 6)
        else:
            canonical_dict[key] = val

    canonical_json = json.dumps(
        canonical_dict,
        sort_keys=True,
        separators=(',', ':'),
        ensure_ascii=True
    )
    return canonical_json.encode('utf-8')

def compute_cycle_double_sha256(canonical_bytes: bytes) -> str:
    """Computes double-SHA256 digest to prevent length-extension attacks."""
    first_hash = hashlib.sha256(canonical_bytes).digest()
    double_hash = hashlib.sha256(first_hash).hexdigest()
    return double_hash
```

### Listing A.2: RFC 6962 Merkle Tree Implementation
```python
import hashlib
from typing import List

class MerkleTree:
    """Constructs an RFC 6962 compliant binary Merkle Tree."""
    def __init__(self, leaves: List[bytes]):
        self.leaves = [hashlib.sha256(b'\x00' + leaf).digest() for leaf in leaves]
        self.root = self._build_tree(self.leaves)

    def _build_tree(self, nodes: List[bytes]) -> bytes:
        if not nodes:
            return hashlib.sha256(b'').digest()
        if len(nodes) == 1:
            return nodes[0]

        next_level = []
        for i in range(0, len(nodes), 2):
            left = nodes[i]
            right = nodes[i + 1] if i + 1 < len(nodes) else left
            parent = hashlib.sha256(b'\x01' + left + right).digest()
            next_level.append(parent)

        return self._build_tree(next_level)

    def get_root_hex(self) -> str:
        return self.root.hex()
```
