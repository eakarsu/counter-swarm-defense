INSERT INTO users (email, password_hash, name, role) VALUES
('admin@demo.com', '$2b$10$e4dPQpe3XIDluCZCv3b3iu/H/3f816tgim6l5ly5k7pChHG235Dey', 'Admin User', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO defense_zones (name, zone_type, security_level, active_sensors, active_countermeasures, status, area_km2, threat_count_30d) VALUES
('Perimeter Alpha', 'perimeter', 'critical', 8, 5, 'active', 12.5, 23),
('Inner Citadel', 'restricted', 'maximum', 12, 8, 'active', 4.2, 7),
('Northern Approach', 'buffer', 'high', 6, 3, 'active', 28.0, 31),
('Southern Corridor', 'buffer', 'high', 5, 3, 'active', 22.1, 18),
('Eastern Flank', 'perimeter', 'critical', 7, 4, 'active', 15.3, 14),
('Western Front', 'perimeter', 'critical', 7, 4, 'active', 16.8, 19),
('Port Sector 7', 'industrial', 'high', 4, 2, 'active', 8.9, 9),
('Airfield Zone', 'aviation', 'maximum', 10, 6, 'active', 35.0, 12),
('Command Perimeter', 'command', 'maximum', 15, 10, 'active', 3.1, 4),
('Harbor Defense', 'maritime', 'high', 6, 3, 'active', 18.5, 16),
('Civilian Zone Alpha', 'civilian', 'medium', 3, 1, 'monitoring', 45.2, 5),
('Forward Operating Base', 'military', 'critical', 9, 6, 'active', 7.8, 28),
('Supply Route Bravo', 'logistics', 'medium', 4, 2, 'active', 52.0, 11),
('Research Facility Delta', 'research', 'high', 5, 3, 'active', 6.4, 8),
('Energy Grid Sector', 'infrastructure', 'critical', 8, 5, 'active', 19.7, 22)
ON CONFLICT DO NOTHING;

INSERT INTO threats (type, drone_count, threat_level, lat, lng, altitude_m, speed_kmh, status, zone_name, classification_group, platform_model) VALUES
('large_swarm', 45, 9.2, 34.0522, -118.2437, 120.0, 85.0, 'neutralized', 'Northern Approach', 'group_2', 'Shahed-136'),
('coordinated_attack', 12, 8.5, 34.0623, -118.2356, 80.0, 65.0, 'neutralized', 'Perimeter Alpha', 'group_1', 'DJI Mavic 3 (weaponized)'),
('single', 1, 3.1, 34.0481, -118.2589, 45.0, 40.0, 'false_alarm', 'Eastern Flank', 'group_1', 'DJI Mini 4'),
('small_swarm', 8, 6.7, 34.0711, -118.2201, 95.0, 72.0, 'neutralized', 'Western Front', 'group_1', 'FPV racing (5-inch)'),
('large_swarm', 67, 9.8, 34.0334, -118.2678, 150.0, 95.0, 'active', 'Southern Corridor', 'group_2', 'Shahed-136'),
('coordinated_attack', 23, 8.9, 34.0556, -118.2445, 110.0, 78.0, 'active', 'Command Perimeter', 'group_2', 'Lancet-3'),
('small_swarm', 5, 5.4, 34.0412, -118.2312, 60.0, 55.0, 'escaped', 'Port Sector 7', 'group_1', 'Autel EVO II'),
('single', 1, 2.8, 34.0689, -118.2534, 30.0, 25.0, 'neutralized', 'Civilian Zone Alpha', 'group_1', 'DJI Phantom 4'),
('large_swarm', 34, 8.3, 34.0598, -118.2198, 130.0, 88.0, 'neutralized', 'Airfield Zone', 'group_2', 'Shahed-131'),
('coordinated_attack', 18, 9.1, 34.0478, -118.2389, 100.0, 75.0, 'neutralized', 'Inner Citadel', 'group_1', 'FPV racing (7-inch)'),
('small_swarm', 7, 6.2, 34.0723, -118.2623, 75.0, 62.0, 'escaped', 'Forward Operating Base', 'group_1', 'Skydio X2'),
('single', 1, 4.0, 34.0501, -118.2456, 55.0, 45.0, 'neutralized', 'Harbor Defense', 'group_1', 'DJI Matrice 30'),
('large_swarm', 89, 9.9, 34.0345, -118.2289, 180.0, 102.0, 'active', 'Energy Grid Sector', 'group_2', 'Shahed-136'),
('small_swarm', 11, 7.1, 34.0634, -118.2567, 85.0, 70.0, 'neutralized', 'Research Facility Delta', 'group_1', 'DJI Mavic 3 (weaponized)'),
('coordinated_attack', 29, 9.4, 34.0412, -118.2178, 125.0, 82.0, 'neutralized', 'Northern Approach', 'group_2', 'Lancet-3'),
('single', 2, 3.5, 34.0557, -118.2634, 40.0, 35.0, 'false_alarm', 'Supply Route Bravo', 'group_1', 'DJI Mini 4')
ON CONFLICT DO NOTHING;

INSERT INTO countermeasures (name, type, status, range_m, ammo_count, success_rate, location, total_deployments, unit_cost_usd, reload_time_s) VALUES
('Smart Shooter SMASH 2000', 'kinetic_smart_sight', 'ready', 250, 30, 0.92, 'Perimeter Alpha Tower 1', 156, 8500.00, 4),
('DroneShield DroneGun MkIII', 'jammer', 'ready', 1000, 999, 0.78, 'Northern Approach Station', 203, 32000.00, 0),
('Anduril Anvil-M', 'interceptor_drone', 'reloading', 3500, 8, 0.85, 'Inner Citadel Gate', 89, 65000.00, 180),
('Coyote Block 3 Interceptor', 'interceptor_drone', 'active', 8000, 6, 0.91, 'Airfield Hangar B', 67, 125000.00, 240),
('Epirus Leonidas (HPM)', 'high_power_microwave', 'ready', 1500, 9999, 0.94, 'Eastern Flank Bunker', 34, 1500.00, 8),
('SkyWall 100 Net Launcher', 'net_launcher', 'ready', 100, 12, 0.88, 'Command Center Level 2', 112, 850.00, 30),
('THOR HPM Counter-Swarm', 'high_power_microwave', 'maintenance', 1000, 9999, 0.96, 'Western Front Tower 4', 98, 1200.00, 6),
('NG M-LIDS Mobile', 'kinetic_30mm', 'active', 4000, 240, 0.86, 'Forward Operating Base', 145, 950.00, 2),
('NetGun X1 Reusable', 'net_launcher', 'ready', 60, 60, 0.82, 'Port Sector Dock 3', 42, 600.00, 25),
('Raytheon Coyote Block 2', 'interceptor_drone', 'ready', 5000, 8, 0.93, 'Command Perimeter Launch Pad', 23, 100000.00, 200),
('Stryker MEHEL Laser', 'directed_energy_laser', 'ready', 3000, 9999, 0.97, 'Inner Citadel Roof', 78, 8.00, 1),
('CACI BEAM Jammer', 'jammer', 'offline', 4000, 999, 0.82, 'Harbor Defense Station', 0, 28000.00, 0),
('FN-Herstal Skynex 35mm', 'kinetic_35mm_ahead', 'ready', 4000, 252, 0.89, 'Airfield Perimeter South', 55, 1200.00, 3),
('Anduril Roadrunner-M', 'interceptor_drone', 'active', 10000, 4, 0.95, 'Northern Approach Air Base', 31, 250000.00, 300),
('IXI DroneKiller RF', 'jammer', 'ready', 1200, 999, 0.74, 'Southern Corridor Station', 19, 18000.00, 0)
ON CONFLICT DO NOTHING;

INSERT INTO deployments (threat_id, countermeasure_id, result, drones_neutralized, response_time_s, operator, notes) VALUES
(1, 2, 'success', 45, 28, 'Operator Chen', 'DroneShield jamming effective against Iranian-pattern swarm'),
(2, 4, 'success', 12, 15, 'Operator Rodriguez', 'Coyote interceptors neutralized all units before perimeter breach'),
(3, 1, 'success', 1, 8, 'Operator Smith', 'Single drone, SMASH 2000 accurate'),
(4, 3, 'partial', 5, 45, 'Operator Kim', 'Anduril Anvil captured 5 of 8, 3 escaped'),
(6, 10, 'pending', 0, 5, 'Operator Zhang', 'Coyote Block 2 launched, engagement ongoing'),
(7, 9, 'failed', 0, 120, 'Operator Garcia', 'NetGun jammed, drones escaped'),
(8, 6, 'success', 1, 3, 'Operator Smith', 'SkyWall 100 net capture of single unit'),
(9, 11, 'success', 34, 22, 'Operator Chen', 'Stryker MEHEL laser engaged sequentially'),
(10, 10, 'success', 18, 18, 'Operator Rodriguez', 'Coyote interceptors swarm-engaged all'),
(12, 1, 'success', 1, 6, 'Operator Kim', 'SMASH clean hit on Matrice 30'),
(14, 2, 'success', 11, 35, 'Operator Zhang', 'DroneShield disrupted swarm coordination'),
(15, 14, 'success', 29, 25, 'Operator Smith', 'Roadrunner-M highly effective against Lancet swarm'),
(16, 6, 'success', 2, 4, 'Operator Garcia', 'Cyber identified as hobbyist, no threat'),
(11, 8, 'partial', 4, 55, 'Operator Chen', 'M-LIDS 30mm got 4 of 7 drones'),
(1, 5, 'partial', 15, 40, 'Operator Rodriguez', 'Leonidas HPM disrupted rotors on 15 units')
ON CONFLICT DO NOTHING;

INSERT INTO sensors (name, type, location, status, range_km, battery_pct, detections_today, firmware_version, frequency_band, azimuth_coverage_deg) VALUES
('RPS-42 Radar Alpha-1', 'radar', 'Perimeter Alpha Tower 1', 'active', 25.0, 92, 14, 'v3.2.1', 'S-band', 360),
('FLIR Ranger HDC-MR', 'eo_ir', 'Northern Approach Hill', 'active', 8.0, 85, 7, 'v2.8.0', 'LWIR-MWIR', 90),
('Squarehead Discovair', 'acoustic', 'Eastern Flank Station', 'active', 5.0, 78, 3, 'v1.9.4', 'audio-band', 360),
('CRFS RFeye Node 100', 'rf_scanner', 'Western Front', 'active', 15.0, 95, 11, 'v4.1.0', '20MHz-6GHz', 360),
('FLIR Triton M324', 'thermal', 'Command Perimeter Roof', 'active', 3.0, 88, 6, 'v3.0.2', 'LWIR', 360),
('Echodyne EchoGuard Ku', 'radar', 'Airfield Zone Tower A', 'active', 30.0, 71, 9, 'v3.2.1', 'Ku-band', 120),
('Teledyne FLIR M-Series', 'eo_ir', 'Southern Corridor', 'maintenance', 8.0, 45, 0, 'v2.7.1', 'LWIR-MWIR', 180),
('DJI Aeroscope G-8', 'rf_scanner', 'Harbor Defense Dock', 'active', 12.0, 89, 5, 'v4.1.0', '2.4/5.8GHz', 360),
('Hensoldt MOAB Acoustic', 'acoustic', 'Forward Operating Base', 'active', 6.0, 93, 8, 'v1.9.4', 'audio-band', 360),
('FLIR Boson 640', 'thermal', 'Inner Citadel Gate', 'active', 2.5, 99, 4, 'v3.0.2', 'LWIR', 75),
('Rohde & Schwarz ARDRONIS', 'rf_scanner', 'Supply Route Bravo North', 'active', 20.0, 67, 2, 'v3.1.5', '70MHz-6GHz', 360),
('Aaronia AARTOS', 'rf_scanner', 'Port Sector 7', 'offline', 15.0, 12, 0, 'v3.9.2', '9kHz-20GHz', 360),
('Echodyne EchoShield X-band', 'radar', 'Energy Grid Sector', 'active', 10.0, 82, 13, 'v2.8.0', 'X-band', 360),
('Sierra Nevada Vigilant Eagle', 'eo_ir', 'Research Facility Delta', 'active', 3.5, 91, 3, 'v3.0.2', 'MWIR', 360),
('Blighter A422 Radar', 'radar', 'Northern Approach Ridge', 'active', 28.0, 76, 17, 'v3.2.1', 'Ku-band', 180)
ON CONFLICT DO NOTHING;

INSERT INTO incidents (title, severity, description, threat_id, response_time_s, drones_involved, casualties, damage_assessment, resolved, occurred_at) VALUES
('Mass Swarm Breach - Northern Approach', 'critical', 'Large swarm of 45 Shahed-136 pattern drones approached from north. DroneShield jamming deployed after initial breach of outer sensor ring.', 1, 28, 45, 0, 'Minor sensor damage at OP-7. Estimated repair: $12,000', true, NOW() - INTERVAL '5 days'),
('Coordinated DJI Mavic Attack', 'high', '12-drone coordinated formation using OcuSync 3.0 link. Coyote interceptors scrambled and neutralized all units.', 2, 15, 12, 0, 'No structural damage. 3 interceptor drones lost: $375,000', true, NOW() - INTERVAL '8 days'),
('Single Drone Incursion - Eastern Flank', 'low', 'Single DJI Mini 4 hobbyist drone flew into restricted zone. Identified as non-military via Aeroscope.', 3, 8, 1, 0, 'No damage', true, NOW() - INTERVAL '12 days'),
('FPV Swarm Escaped Western Front', 'high', '8-drone FPV swarm evaded initial Anvil engagement due to 5.8GHz jam-resistance. 5 neutralized, 3 escaped.', 4, 45, 8, 0, 'Anvil bay damaged: $8,500', true, NOW() - INTERVAL '15 days'),
('Mega Swarm Active - Southern Corridor', 'critical', '67-drone Shahed swarm currently engaged. Largest single attack recorded. Leonidas HPM + Coyote in coordination.', 5, 12, 67, 0, 'Assessment ongoing - attack in progress', false, NOW() - INTERVAL '1 hour'),
('Lancet Strike on Command Center', 'critical', '23-drone AI-guided Lancet attack targeted command center. Roadrunner-M engaged. Outcome pending.', 6, 5, 23, 0, 'TBD - active engagement', false, NOW() - INTERVAL '30 minutes'),
('Airfield Shahed-131 Swarm', 'high', '34-drone Shahed-131 swarm targeted airfield. Stryker MEHEL achieved 100% kill in 22 seconds.', 9, 22, 34, 0, 'No damage to aircraft. 2 sensor pods overheated: $3,200', true, NOW() - INTERVAL '20 days'),
('Inner Citadel FPV Attack', 'critical', '18-drone FPV racing-class attack on inner citadel. Coyote Block 2 achieved full neutralization.', 10, 18, 18, 0, 'Concrete spalling on Gate 3: $15,000', true, NOW() - INTERVAL '25 days'),
('Energy Grid Shahed Mega Attack', 'critical', '89-drone Shahed-136 swarm targeting critical power infrastructure. All available countermeasures engaged.', 13, 8, 89, 2, 'Transformer station 4 damaged: $2.3M. Power outage 4 hours.', false, NOW() - INTERVAL '2 hours'),
('Research Facility Mavic Probe', 'medium', '11-drone DJI Mavic 3 (weaponized) ISR formation detected. DroneShield disrupted 4 drones.', 14, 35, 11, 0, 'Possible signal intelligence gathered', false, NOW() - INTERVAL '3 days'),
('Acoustic Stealth Drone - Port', 'medium', 'RF-silent autonomous drone detected by Discovair acoustic only. NetGun malfunction allowed escape.', 7, 120, 5, 0, 'Port security logs exposed', false, NOW() - INTERVAL '6 days'),
('Harbor Defense Probe', 'low', 'Single reconnaissance Matrice 30 over harbor. SkyWall net capture successful.', 12, 6, 1, 0, 'No damage', true, NOW() - INTERVAL '18 days'),
('Northern Ridge Lancet Strike', 'critical', '29-drone Lancet-3 attack on northern ridge. Roadrunner-M deployed and achieved 100% neutralization.', 15, 25, 29, 0, 'Minimal: 2 guard posts displaced: $4,500', true, NOW() - INTERVAL '30 days'),
('False Alarm - Southern Approach', 'low', 'Bird flock triggered acoustic sensors. Verified false alarm after Aeroscope confirmation.', NULL, 12, 0, 0, 'No damage', true, NOW() - INTERVAL '40 days'),
('M-LIDS Partial Success', 'medium', 'Swarm of 7 Skydio X2 at forward base. M-LIDS 30mm deployed, 4 neutralized, 3 escaped at tree line.', 11, 55, 7, 0, 'Perimeter fence damaged: $6,200', true, NOW() - INTERVAL '22 days')
ON CONFLICT DO NOTHING;

-- ============================================================
-- THREAT SIGNATURES — real platforms
-- ============================================================
INSERT INTO threat_signatures (platform_name, manufacturer, country_of_origin, dod_group, mtow_kg, wingspan_m, cruise_speed_kmh, max_range_km, rf_protocol, rf_band, radar_cross_section_m2, ir_signature, acoustic_signature_db, payload_capacity_kg, warhead_kg, autonomy_level, jam_resistance, threat_priority, notes) VALUES
('Shahed-136', 'HESA / Iran Aircraft Mfg', 'Iran', 'group_3', 200.0, 2.5, 185.0, 2500.0, 'inertial+gps-waypoint', 'L1/L2 GNSS', 0.10, 'medium', 78.0, 50.0, 40.0, 'gps-waypoint', 'high', 1, 'One-way attack munition (loitering). Pop-pop engine acoustic signature distinctive at 50m. Used widely in Ukraine 2022-2025.'),
('Shahed-131', 'HESA', 'Iran', 'group_3', 135.0, 2.2, 200.0, 900.0, 'inertial+gps-waypoint', 'L1/L2 GNSS', 0.08, 'medium', 65.0, 30.0, 15.0, 'gps-waypoint', 'high', 1, 'Smaller Shahed variant. Same engine class.'),
('Lancet-3 (Izdeliye-52)', 'ZALA Aero / Kalashnikov', 'Russia', 'group_2', 12.0, 1.65, 110.0, 70.0, 'datalink+ai-onboard', '900MHz / 2.4GHz', 0.04, 'low', 62.0, 3.0, 3.0, 'ai-onboard', 'medium', 2, 'Loitering munition with onboard machine vision terminal guidance. Cross-shaped wings.'),
('Lancet-1', 'ZALA Aero / Kalashnikov', 'Russia', 'group_1', 5.0, 1.1, 110.0, 40.0, 'datalink+ai-onboard', '900MHz / 2.4GHz', 0.02, 'low', 58.0, 1.0, 1.0, 'ai-onboard', 'medium', 3, 'Smaller Lancet variant.'),
('DJI Mavic 3 Pro', 'DJI', 'China', 'group_1', 0.958, 0.38, 75.0, 28.0, 'DJI OcuSync O3+', '2.4/5.8GHz', 0.005, 'very_low', 55.0, 0.5, 0.0, 'gps-waypoint', 'low', 4, 'Commercial drone weaponized w/ <500g grenade in Ukraine.'),
('DJI Mini 4 Pro', 'DJI', 'China', 'group_1', 0.249, 0.30, 57.0, 20.0, 'DJI OcuSync O4', '2.4/5.8GHz', 0.003, 'very_low', 48.0, 0.1, 0.0, 'gps-waypoint', 'low', 6, 'Sub-250g class. Hard to detect on radar.'),
('DJI Matrice 30T', 'DJI', 'China', 'group_1', 3.77, 0.65, 82.0, 30.0, 'DJI OcuSync 3+', '2.4/5.8GHz', 0.012, 'low', 64.0, 1.0, 0.0, 'gps-waypoint', 'low', 4, 'ISR-class with thermal payload.'),
('FPV 5-inch racing', 'various / custom', 'Various', 'group_1', 0.7, 0.22, 140.0, 5.0, 'ExpressLRS 868/915MHz', '2.4GHz video, 868MHz ctrl', 0.002, 'very_low', 72.0, 0.5, 0.5, 'gps-waypoint', 'medium', 2, 'Commodity FPV w/ RPG warhead. Backbone of Ukraine drone war. High speed terminal dive.'),
('FPV 7-inch long-range', 'various / custom', 'Various', 'group_1', 1.5, 0.30, 120.0, 20.0, 'ExpressLRS 915MHz', '2.4GHz video, 915MHz ctrl', 0.003, 'very_low', 75.0, 1.5, 1.0, 'gps-waypoint', 'medium', 2, 'Heavier payload FPV.'),
('Autel EVO II Pro', 'Autel Robotics', 'China', 'group_1', 1.19, 0.40, 72.0, 25.0, 'Autel SkyLink 2.0', '2.4/5.8GHz', 0.006, 'very_low', 58.0, 0.5, 0.0, 'gps-waypoint', 'low', 5, 'DJI-equivalent commercial platform.'),
('Skydio X2D', 'Skydio', 'USA', 'group_1', 1.3, 0.45, 58.0, 15.0, 'Skydio mesh', '5GHz mesh', 0.005, 'very_low', 56.0, 0.5, 0.0, 'ai-onboard', 'high', 5, 'Onboard AI obstacle avoidance — partially jam-resistant.'),
('Switchblade 300', 'AeroVironment', 'USA', 'group_1', 2.5, 0.6, 100.0, 10.0, 'C-band datalink', 'C-band', 0.008, 'low', 60.0, 0.4, 0.4, 'datalink', 'medium', 3, 'Tube-launched loitering munition.'),
('ZALA KUB-BLA', 'ZALA Aero', 'Russia', 'group_2', 3.0, 1.21, 130.0, 40.0, 'datalink', '900MHz', 0.02, 'low', 62.0, 3.0, 3.0, 'datalink', 'medium', 3, 'Predecessor to Lancet.'),
('Bayraktar TB2', 'Baykar', 'Turkey', 'group_3', 700.0, 12.0, 220.0, 300.0, 'Ku-band SATCOM', 'Ku-band', 0.50, 'medium', 80.0, 150.0, 22.0, 'datalink', 'medium', 2, 'Higher-tier UAV. Distinct from swarm threat but in catalog.'),
('Custom mesh-swarm (DARPA pattern)', 'research-stage', 'Various', 'group_1', 0.8, 0.25, 90.0, 10.0, 'mesh-radio 900MHz', 'mesh 900MHz', 0.003, 'very_low', 68.0, 0.2, 0.2, 'swarm-mesh', 'high', 1, 'Autonomous mesh-coordinated. Loss of one does not break swarm. AI onboard.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FUSION TRACKS
-- ============================================================
INSERT INTO fusion_tracks (track_uid, threat_id, signature_id, contributing_sensors, sensor_count, fusion_confidence, classification, lat, lng, altitude_m, heading_deg, speed_kmh, rf_detected, radar_detected, eo_ir_detected, acoustic_detected, track_state, first_detected_at, last_update_at) VALUES
('TRK-2026-0001', 1, 1, '1,4,2', 3, 0.94, 'Shahed-136 swarm', 34.0522, -118.2437, 120.0, 180.0, 85.0, true, true, true, false, 'confirmed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('TRK-2026-0002', 2, 5, '4,1,2', 3, 0.97, 'DJI Mavic 3 formation', 34.0623, -118.2356, 80.0, 220.0, 65.0, true, true, true, false, 'confirmed', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('TRK-2026-0003', 3, 6, '8', 1, 0.62, 'DJI Mini (hobbyist)', 34.0481, -118.2589, 45.0, 90.0, 40.0, true, false, false, false, 'confirmed', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
('TRK-2026-0004', 4, 8, '4,3', 2, 0.81, 'FPV swarm (5-inch)', 34.0711, -118.2201, 95.0, 270.0, 72.0, true, false, false, true, 'confirmed', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('TRK-2026-0005', 5, 1, '1,6,2,9', 4, 0.99, 'Shahed-136 mega-swarm', 34.0334, -118.2678, 150.0, 0.0, 95.0, true, true, true, true, 'confirmed', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
('TRK-2026-0006', 6, 3, '6,4,2', 3, 0.91, 'Lancet-3 formation', 34.0556, -118.2445, 110.0, 45.0, 78.0, true, true, true, false, 'confirmed', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
('TRK-2026-0007', 7, 10, '3,4', 2, 0.55, 'Autel EVO (acoustic-only)', 34.0412, -118.2312, 60.0, 135.0, 55.0, false, false, false, true, 'tentative', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('TRK-2026-0008', 9, 2, '6,13,2', 3, 0.95, 'Shahed-131 swarm', 34.0598, -118.2198, 130.0, 270.0, 88.0, true, true, true, false, 'confirmed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
('TRK-2026-0009', 10, 8, '4,3,10', 3, 0.79, 'FPV 7-inch swarm', 34.0478, -118.2389, 100.0, 0.0, 75.0, true, false, false, true, 'confirmed', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
('TRK-2026-0010', 13, 1, '13,1,11,2', 4, 0.99, 'Shahed-136 mega-swarm (89)', 34.0345, -118.2289, 180.0, 360.0, 102.0, true, true, true, true, 'confirmed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
('TRK-2026-0011', 15, 3, '15,4,9', 3, 0.93, 'Lancet-3 wave-attack', 34.0412, -118.2178, 125.0, 180.0, 82.0, true, true, true, false, 'confirmed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('TRK-2026-0012', NULL, 15, '4,9,3', 3, 0.42, 'Unknown swarm-mesh', 34.0900, -118.2900, 90.0, 90.0, 88.0, false, true, false, true, 'tentative', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;

-- ============================================================
-- EFFECTOR MAGAZINES
-- ============================================================
INSERT INTO effector_magazines (countermeasure_id, munition_type, rounds_remaining, rounds_capacity, unit_cost_usd, resupply_lead_days, total_fired, total_hits) VALUES
(1, 'kinetic_smart_5.56', 30, 30, 1.20, 3, 156, 144),
(2, 'jam_burst', 9999, 9999, 0.05, 0, 203, 158),
(3, 'kinetic_interceptor', 8, 12, 65000.00, 21, 89, 76),
(4, 'kinetic_interceptor', 6, 12, 125000.00, 30, 67, 61),
(5, 'hpm_pulse', 9999, 9999, 0.50, 0, 34, 32),
(6, 'net_canister', 12, 12, 850.00, 5, 112, 98),
(7, 'hpm_pulse', 9999, 9999, 0.50, 0, 98, 94),
(8, 'kinetic_30mm', 240, 240, 950.00, 14, 145, 125),
(9, 'net_reusable', 60, 60, 600.00, 5, 42, 35),
(10, 'kinetic_interceptor', 8, 12, 100000.00, 30, 23, 21),
(11, 'laser_pulse', 9999, 9999, 0.10, 0, 78, 76),
(12, 'jam_burst', 999, 999, 0.05, 0, 0, 0),
(13, 'kinetic_35mm_ahead', 252, 252, 1200.00, 14, 55, 49),
(14, 'kinetic_interceptor', 4, 8, 250000.00, 45, 31, 30),
(15, 'jam_burst', 999, 999, 0.05, 0, 19, 14)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROE RULES
-- ============================================================
INSERT INTO roe_rules (rule_code, zone_name, min_threat_level, authorized_effector_types, requires_visual_id, requires_command_approval, collateral_check_required, active, description) VALUES
('ROE-01-CIV', 'Civilian Zone Alpha', 7.0, 'jammer,net_launcher', true, true, true, true, 'Civilian zone: no kinetic, visual ID + command approval required, collateral check mandatory.'),
('ROE-02-PERIM', 'Perimeter Alpha', 5.0, 'jammer,net_launcher,kinetic_smart_sight,high_power_microwave,interceptor_drone', false, false, false, true, 'Standard perimeter: operator-cleared engagement above threat_level 5.'),
('ROE-03-CITADEL', 'Inner Citadel', 3.0, 'jammer,net_launcher,interceptor_drone,directed_energy_laser', false, false, false, true, 'Inner citadel: lower threshold, all effector classes authorized.'),
('ROE-04-AIRFIELD', 'Airfield Zone', 4.0, 'kinetic_35mm_ahead,directed_energy_laser,interceptor_drone,jammer', false, false, true, true, 'Airfield: avoid kinetic toward runway. Collateral check required.'),
('ROE-05-CMD', 'Command Perimeter', 2.0, 'interceptor_drone,directed_energy_laser,jammer', false, true, false, true, 'Command perimeter: aggressive RoE, command notification post-engagement.'),
('ROE-06-MARITIME', 'Harbor Defense', 6.0, 'jammer,net_launcher,kinetic_smart_sight', false, false, true, true, 'Maritime zone: surface-vessel collateral check.'),
('ROE-07-ENERGY', 'Energy Grid Sector', 4.0, 'high_power_microwave,interceptor_drone,kinetic_30mm', false, false, true, true, 'Energy infrastructure: HPM preferred (no debris on transformers).'),
('ROE-08-FOB', 'Forward Operating Base', 3.0, 'jammer,kinetic_30mm,kinetic_35mm_ahead,interceptor_drone,high_power_microwave', false, false, false, true, 'FOB: weapons free above threat 3.'),
('ROE-09-SUPPLY', 'Supply Route Bravo', 7.0, 'jammer,net_launcher', false, true, true, true, 'Supply route: cautious, jamming preferred. Command approval over threshold.'),
('ROE-10-RESEARCH', 'Research Facility Delta', 5.0, 'jammer,directed_energy_laser,high_power_microwave', false, false, true, true, 'Research facility: avoid debris on sensitive equipment.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ENGAGEMENTS — DITDEA kill chain instances
-- ============================================================
INSERT INTO engagements (engagement_uid, track_id, threat_id, countermeasure_id, current_phase, cleared_to_engage, authorizing_officer, roe_rule_id, pk_estimate, expected_cost_usd, outcome, drones_engaged, drones_killed, started_at, closed_at, notes) VALUES
('ENG-2026-0001', 1, 1, 2, 'assess', true, 'LTC Chen', 3, 0.85, 0.05, 'neutralized', 45, 45, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '28 seconds', 'Full neutralization via DroneShield jamming. Cost-per-kill: ~$0.001'),
('ENG-2026-0002', 2, 2, 4, 'assess', true, 'MAJ Rodriguez', 2, 0.92, 250000.00, 'neutralized', 12, 12, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '15 seconds', 'Coyote interceptors engaged. Cost-per-kill: ~$20,833 — sustainable for high-value targets only.'),
('ENG-2026-0003', 3, 3, 1, 'assess', true, 'SSG Smith', 2, 0.95, 1.20, 'neutralized', 1, 1, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days' + INTERVAL '8 seconds', 'SMASH 2000 single-round neutralization. Optimal cost-per-kill.'),
('ENG-2026-0004', 4, 4, 3, 'assess', true, 'MAJ Kim', 2, 0.75, 195000.00, 'partial', 8, 5, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '45 seconds', 'Anvil partial success. 3 FPV escaped due to 5.8GHz jam-resistance.'),
('ENG-2026-0005', 5, 5, 5, 'engage', true, 'COL Zhang', 7, 0.88, 4.50, 'pending', 67, 0, NOW() - INTERVAL '1 hour', NULL, 'Engagement ongoing. Leonidas HPM cued.'),
('ENG-2026-0006', 6, 6, 14, 'decide', false, NULL, 5, 0.91, 1000000.00, 'pending', 23, 0, NOW() - INTERVAL '30 minutes', NULL, 'Awaiting command approval (ROE-05 requires CMD nod). Roadrunner-M cued.'),
('ENG-2026-0007', 8, 9, 11, 'assess', true, 'LTC Chen', 4, 0.97, 0.80, 'neutralized', 34, 34, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '22 seconds', 'Stryker MEHEL sequential laser engagement. ~$0.024/kill — best-in-class.'),
('ENG-2026-0008', 9, 10, 10, 'assess', true, 'MAJ Rodriguez', 3, 0.93, 800000.00, 'neutralized', 18, 18, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days' + INTERVAL '18 seconds', 'Coyote Block 2 full neutralization.'),
('ENG-2026-0009', 10, 13, 5, 'engage', true, 'COL Zhang', 7, 0.86, 9.00, 'pending', 89, 0, NOW() - INTERVAL '2 hours', NULL, 'Mega-swarm engagement. HPM pulses cycling.'),
('ENG-2026-0010', 11, 15, 14, 'assess', true, 'LTC Chen', 2, 0.95, 1000000.00, 'neutralized', 29, 29, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '25 seconds', 'Roadrunner-M sequential Lancet kills.')
ON CONFLICT DO NOTHING;

INSERT INTO engagement_events (engagement_id, phase, actor, event_type, detail, occurred_at) VALUES
(1, 'detect', 'RPS-42 Radar Alpha-1', 'first-contact', '45 contacts bearing 360, range 25km, descending', NOW() - INTERVAL '5 days'),
(1, 'identify', 'CRFS RFeye Node 100', 'signature-match', 'Matched Shahed-136 GNSS pattern (sig_id=1) confidence 0.94', NOW() - INTERVAL '5 days' + INTERVAL '4 seconds'),
(1, 'track', 'Fusion Engine', 'track-confirmed', 'Track TRK-2026-0001 confirmed by 3 sensors', NOW() - INTERVAL '5 days' + INTERVAL '8 seconds'),
(1, 'decide', 'LTC Chen', 'cleared-to-engage', 'ROE-03 satisfied, weapons free', NOW() - INTERVAL '5 days' + INTERVAL '12 seconds'),
(1, 'engage', 'DroneShield DroneGun MkIII', 'effector-fire', 'Broadband jam burst on GNSS L1/L2', NOW() - INTERVAL '5 days' + INTERVAL '14 seconds'),
(1, 'assess', 'FLIR Ranger HDC-MR', 'kill-confirmed', '45 of 45 contacts fell from sky', NOW() - INTERVAL '5 days' + INTERVAL '28 seconds'),
(2, 'detect', 'Echodyne EchoGuard Ku', 'first-contact', '12 contacts low-altitude formation', NOW() - INTERVAL '8 days'),
(2, 'identify', 'DJI Aeroscope G-8', 'signature-match', 'OcuSync 3.0 signal matched DJI Mavic 3 fleet, MAC IDs spoofed', NOW() - INTERVAL '8 days' + INTERVAL '3 seconds'),
(2, 'decide', 'MAJ Rodriguez', 'cleared-to-engage', 'ROE-02 satisfied', NOW() - INTERVAL '8 days' + INTERVAL '5 seconds'),
(2, 'engage', 'Coyote Block 3 Interceptor', 'effector-fire', '4 Coyote launched (3-vs-12 saturation profile)', NOW() - INTERVAL '8 days' + INTERVAL '7 seconds'),
(2, 'assess', 'Echodyne EchoGuard Ku', 'kill-confirmed', '12/12 kills, 3 Coyote expended', NOW() - INTERVAL '8 days' + INTERVAL '15 seconds'),
(5, 'detect', 'RPS-42 Radar Alpha-1', 'first-contact', '67 contacts incoming from south', NOW() - INTERVAL '1 hour'),
(5, 'identify', 'CRFS RFeye Node 100', 'signature-match', 'Shahed-136 pattern reaffirmed', NOW() - INTERVAL '1 hour' + INTERVAL '4 seconds'),
(5, 'decide', 'COL Zhang', 'cleared-to-engage', 'Energy grid ROE-07: HPM preferred', NOW() - INTERVAL '1 hour' + INTERVAL '8 seconds'),
(5, 'engage', 'Epirus Leonidas (HPM)', 'effector-fire', 'HPM pulse cycle initiated', NOW() - INTERVAL '1 hour' + INTERVAL '12 seconds'),
(6, 'detect', 'Echodyne EchoGuard Ku', 'first-contact', '23 Lancet contacts', NOW() - INTERVAL '30 minutes'),
(6, 'identify', 'Sierra Nevada Vigilant Eagle', 'signature-match', 'Lancet-3 IR pattern matched', NOW() - INTERVAL '30 minutes' + INTERVAL '3 seconds'),
(6, 'track', 'Fusion Engine', 'track-confirmed', 'TRK-2026-0006 confirmed', NOW() - INTERVAL '30 minutes' + INTERVAL '5 seconds')
ON CONFLICT DO NOTHING;

INSERT INTO roe_authorizations (engagement_id, rule_id, requested_by, approved_by, decision, decision_at, conditions, rationale) VALUES
(1, 3, 'LTC Chen', 'LTC Chen', 'approved', NOW() - INTERVAL '5 days' + INTERVAL '12 seconds', NULL, 'ROE-03 standing authorization, no civilian collateral'),
(2, 2, 'MAJ Rodriguez', 'MAJ Rodriguez', 'approved', NOW() - INTERVAL '8 days' + INTERVAL '5 seconds', NULL, 'Standard perimeter, operator-cleared'),
(4, 2, 'MAJ Kim', 'MAJ Kim', 'approved', NOW() - INTERVAL '15 days' + INTERVAL '8 seconds', NULL, 'Standard perimeter, operator-cleared'),
(5, 7, 'COL Zhang', 'COL Zhang', 'approved', NOW() - INTERVAL '1 hour' + INTERVAL '8 seconds', 'Limit HPM to <60° azimuth from grid substation', 'HPM preferred for energy infrastructure — no debris field'),
(6, 5, 'MAJ Rodriguez', NULL, 'conditional', NULL, 'Awaiting CMD nod per ROE-05', 'Command perimeter requires explicit command approval'),
(7, 4, 'LTC Chen', 'LTC Chen', 'approved', NOW() - INTERVAL '20 days' + INTERVAL '6 seconds', 'No engagement toward runway', 'Airfield ROE-04 — laser only, runway clear'),
(8, 3, 'MAJ Rodriguez', 'MAJ Rodriguez', 'approved', NOW() - INTERVAL '25 days' + INTERVAL '4 seconds', NULL, 'Inner citadel standing'),
(9, 7, 'COL Zhang', 'COL Zhang', 'approved', NOW() - INTERVAL '2 hours' + INTERVAL '6 seconds', NULL, 'Energy grid ongoing'),
(10, 2, 'LTC Chen', 'LTC Chen', 'approved', NOW() - INTERVAL '30 days' + INTERVAL '5 seconds', NULL, 'Northern Approach standing'),
(3, 2, 'SSG Smith', 'SSG Smith', 'approved', NOW() - INTERVAL '12 days' + INTERVAL '2 seconds', NULL, 'Standard perimeter')
ON CONFLICT DO NOTHING;
