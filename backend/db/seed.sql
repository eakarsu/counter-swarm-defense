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

INSERT INTO threats (type, drone_count, threat_level, lat, lng, altitude_m, speed_kmh, status, zone_name) VALUES
('large_swarm', 45, 9.2, 34.0522, -118.2437, 120.0, 85.0, 'neutralized', 'Northern Approach'),
('coordinated_attack', 12, 8.5, 34.0623, -118.2356, 80.0, 65.0, 'neutralized', 'Perimeter Alpha'),
('single', 1, 3.1, 34.0481, -118.2589, 45.0, 40.0, 'false_alarm', 'Eastern Flank'),
('small_swarm', 8, 6.7, 34.0711, -118.2201, 95.0, 72.0, 'neutralized', 'Western Front'),
('large_swarm', 67, 9.8, 34.0334, -118.2678, 150.0, 95.0, 'active', 'Southern Corridor'),
('coordinated_attack', 23, 8.9, 34.0556, -118.2445, 110.0, 78.0, 'active', 'Command Perimeter'),
('small_swarm', 5, 5.4, 34.0412, -118.2312, 60.0, 55.0, 'escaped', 'Port Sector 7'),
('single', 1, 2.8, 34.0689, -118.2534, 30.0, 25.0, 'neutralized', 'Civilian Zone Alpha'),
('large_swarm', 34, 8.3, 34.0598, -118.2198, 130.0, 88.0, 'neutralized', 'Airfield Zone'),
('coordinated_attack', 18, 9.1, 34.0478, -118.2389, 100.0, 75.0, 'neutralized', 'Inner Citadel'),
('small_swarm', 7, 6.2, 34.0723, -118.2623, 75.0, 62.0, 'escaped', 'Forward Operating Base'),
('single', 1, 4.0, 34.0501, -118.2456, 55.0, 45.0, 'neutralized', 'Harbor Defense'),
('large_swarm', 89, 9.9, 34.0345, -118.2289, 180.0, 102.0, 'active', 'Energy Grid Sector'),
('small_swarm', 11, 7.1, 34.0634, -118.2567, 85.0, 70.0, 'neutralized', 'Research Facility Delta'),
('coordinated_attack', 29, 9.4, 34.0412, -118.2178, 125.0, 82.0, 'neutralized', 'Northern Approach'),
('single', 2, 3.5, 34.0557, -118.2634, 40.0, 35.0, 'false_alarm', 'Supply Route Bravo')
ON CONFLICT DO NOTHING;

INSERT INTO countermeasures (name, type, status, range_m, ammo_count, success_rate, location, total_deployments) VALUES
('Laser Array Unit Alpha', 'laser', 'ready', 2500, 999, 0.94, 'Perimeter Alpha Tower 1', 156),
('RF Jammer Node 7', 'jammer', 'ready', 3000, 999, 0.78, 'Northern Approach Station', 203),
('Net Launcher Battery A', 'net_launcher', 'reloading', 500, 24, 0.85, 'Inner Citadel Gate', 89),
('Interceptor Drone Bay 3', 'interceptor_drone', 'active', 5000, 12, 0.91, 'Airfield Hangar B', 67),
('Aerosol Dispersal Unit 2', 'aerosol', 'ready', 800, 45, 0.72, 'Eastern Flank Bunker', 34),
('Cyber Warfare Suite C', 'cyber', 'ready', 999999, 999, 0.88, 'Command Center Level 2', 112),
('Laser Array Unit Beta', 'laser', 'maintenance', 2500, 0, 0.94, 'Western Front Tower 4', 98),
('RF Jammer Mobile Unit', 'jammer', 'active', 2000, 999, 0.76, 'Forward Operating Base', 145),
('Net Launcher Grid B', 'net_launcher', 'ready', 500, 60, 0.87, 'Port Sector Dock 3', 42),
('Interceptor Bay 1', 'interceptor_drone', 'ready', 5000, 8, 0.93, 'Command Perimeter Launch Pad', 23),
('High-Power Laser Turret', 'laser', 'ready', 3500, 999, 0.96, 'Inner Citadel Roof', 78),
('EW Jamming Platform', 'jammer', 'offline', 4000, 999, 0.82, 'Harbor Defense Station', 0),
('Mass Net System Alpha', 'net_launcher', 'ready', 700, 30, 0.89, 'Airfield Perimeter South', 55),
('Swarm Interceptor Squad', 'interceptor_drone', 'active', 8000, 6, 0.95, 'Northern Approach Air Base', 31),
('Bio-Aerosol Grid', 'aerosol', 'ready', 1200, 80, 0.68, 'Southern Corridor Station', 19)
ON CONFLICT DO NOTHING;

INSERT INTO deployments (threat_id, countermeasure_id, result, drones_neutralized, response_time_s, operator, notes) VALUES
(1, 2, 'success', 45, 28, 'Operator Chen', 'RF jamming effective against Iranian-pattern swarm'),
(2, 4, 'success', 12, 15, 'Operator Rodriguez', 'Interceptors neutralized all units before perimeter breach'),
(3, 1, 'success', 1, 8, 'Operator Smith', 'Single drone, laser accurate'),
(4, 3, 'partial', 5, 45, 'Operator Kim', 'Net captured 5 of 8, 3 escaped'),
(6, 10, 'pending', 0, 5, 'Operator Zhang', 'Interceptors launched, engagement ongoing'),
(7, 9, 'failed', 0, 120, 'Operator Garcia', 'Net launcher jammed, drones escaped'),
(8, 6, 'success', 1, 3, 'Operator Smith', 'Cyber takeover of single unit'),
(9, 11, 'success', 34, 22, 'Operator Chen', 'High-power laser turret performed excellently'),
(10, 10, 'success', 18, 18, 'Operator Rodriguez', 'Interceptors engaged and neutralized all'),
(12, 1, 'success', 1, 6, 'Operator Kim', 'Laser array clean hit'),
(14, 2, 'success', 11, 35, 'Operator Zhang', 'Jamming disrupted swarm coordination'),
(15, 14, 'success', 29, 25, 'Operator Smith', 'Swarm interceptor squad highly effective'),
(16, 6, 'success', 2, 4, 'Operator Garcia', 'Cyber identified as hobbyist, no threat'),
(11, 8, 'partial', 4, 55, 'Operator Chen', 'Mobile jammer got 4 of 7 drones'),
(1, 5, 'partial', 15, 40, 'Operator Rodriguez', 'Aerosol disrupted rotors on 15 units')
ON CONFLICT DO NOTHING;

INSERT INTO sensors (name, type, location, status, range_km, battery_pct, detections_today, firmware_version) VALUES
('Radar Alpha-1', 'radar', 'Perimeter Alpha Tower 1', 'active', 25.0, 92, 14, 'v3.2.1'),
('Optical Grid N7', 'optical', 'Northern Approach Hill', 'active', 8.0, 85, 7, 'v2.8.0'),
('Acoustic Array E3', 'acoustic', 'Eastern Flank Station', 'active', 5.0, 78, 3, 'v1.9.4'),
('RF Scanner W1', 'rf_scanner', 'Western Front', 'active', 15.0, 95, 11, 'v4.1.0'),
('Thermal Cam C9', 'thermal', 'Command Perimeter Roof', 'active', 3.0, 88, 6, 'v3.0.2'),
('Radar Beta-2', 'radar', 'Airfield Zone Tower A', 'active', 30.0, 71, 9, 'v3.2.1'),
('Optical Grid S4', 'optical', 'Southern Corridor', 'maintenance', 8.0, 45, 0, 'v2.7.1'),
('RF Scanner H2', 'rf_scanner', 'Harbor Defense Dock', 'active', 12.0, 89, 5, 'v4.1.0'),
('Acoustic Array F1', 'acoustic', 'Forward Operating Base', 'active', 6.0, 93, 8, 'v1.9.4'),
('Thermal Array I1', 'thermal', 'Inner Citadel Gate', 'active', 2.5, 99, 4, 'v3.0.2'),
('Radar Gamma-3', 'radar', 'Supply Route Bravo North', 'active', 20.0, 67, 2, 'v3.1.5'),
('RF Scanner P1', 'rf_scanner', 'Port Sector 7', 'offline', 15.0, 12, 0, 'v3.9.2'),
('Optical Grid E4', 'optical', 'Energy Grid Sector', 'active', 10.0, 82, 13, 'v2.8.0'),
('Thermal Cam R1', 'thermal', 'Research Facility Delta', 'active', 3.5, 91, 3, 'v3.0.2'),
('Radar Delta-4', 'radar', 'Northern Approach Ridge', 'active', 28.0, 76, 17, 'v3.2.1')
ON CONFLICT DO NOTHING;

INSERT INTO incidents (title, severity, description, threat_id, response_time_s, drones_involved, casualties, damage_assessment, resolved, occurred_at) VALUES
('Mass Swarm Breach - Northern Approach', 'critical', 'Large swarm of 45 Iranian-pattern FPV drones approached from north. RF jamming deployed successfully after initial breach of outer sensor ring.', 1, 28, 45, 0, 'Minor sensor damage at OP-7. Estimated repair: $12,000', true, NOW() - INTERVAL '5 days'),
('Coordinated Attack on Perimeter', 'high', '12-drone coordinated formation attack using relay-node autonomous guidance. Interceptors scrambled and neutralized all units.', 2, 15, 12, 0, 'No structural damage. 3 interceptor drones lost: $45,000', true, NOW() - INTERVAL '8 days'),
('Single Drone Incursion - Eastern Flank', 'low', 'Single hobbyist drone flew into restricted zone. Identified as non-military via optical analysis.', 3, 8, 1, 0, 'No damage', true, NOW() - INTERVAL '12 days'),
('Small Swarm - Escaped Western Front', 'high', '8-drone swarm evaded initial net launcher due to malfunction. 5 neutralized, 3 escaped zone boundary.', 4, 45, 8, 0, 'Net launcher system damaged: $8,500', true, NOW() - INTERVAL '15 days'),
('Mega Swarm Active - Southern Corridor', 'critical', '67-drone swarm currently engaged. Largest single attack recorded. Multiple countermeasures deployed.', 5, 12, 67, 0, 'Assessment ongoing - attack in progress', false, NOW() - INTERVAL '1 hour'),
('Coordinated Strike on Command Center', 'critical', '23-drone AI-guided attack targeted command center. Interceptors engaged. Outcome pending.', 6, 5, 23, 0, 'TBD - active engagement', false, NOW() - INTERVAL '30 minutes'),
('Airfield Swarm Attack', 'high', '34-drone swarm targeted airfield. High-power laser array achieved 100% neutralization rate in 22 seconds.', 9, 22, 34, 0, 'No damage to aircraft. 2 sensor pods overheated: $3,200', true, NOW() - INTERVAL '20 days'),
('Inner Citadel Attack', 'critical', '18-drone coordinated attack on inner citadel. Interceptor drone bay achieved full neutralization.', 10, 18, 18, 0, 'Concrete spalling on Gate 3: $15,000', true, NOW() - INTERVAL '25 days'),
('Energy Grid Mega Attack', 'critical', '89-drone swarm targeting critical power infrastructure. All available countermeasures engaged.', 13, 8, 89, 2, 'Transformer station 4 damaged: $2.3M. Power outage 4 hours.', false, NOW() - INTERVAL '2 hours'),
('Research Facility Probe', 'medium', '11-drone intelligence-gathering formation detected. Mobile jammer disrupted 4 drones.', 14, 35, 11, 0, 'Possible signal intelligence gathered: non-physical', false, NOW() - INTERVAL '3 days'),
('Acoustic Stealth Drone - Port', 'medium', 'RF-silent acoustic-motor drone detected by acoustic array only. Net launcher malfunction allowed escape.', 7, 120, 5, 0, 'Port security logs exposed: classified breach', false, NOW() - INTERVAL '6 days'),
('Harbor Defense Probe', 'low', 'Single reconnaissance drone over harbor. Cyber takeover successful, landed at designated zone.', 12, 6, 1, 0, 'No damage', true, NOW() - INTERVAL '18 days'),
('Northern Ridge Mass Attack', 'critical', '29-drone coordinated attack on northern ridge. Swarm interceptor squad deployed and achieved 100% neutralization.', 15, 25, 29, 0, 'Minimal: 2 guard posts displaced: $4,500', true, NOW() - INTERVAL '30 days'),
('False Alarm - Southern Approach', 'low', 'Bird flock triggered acoustic sensors. Verified false alarm after optical confirmation.', NULL, 12, 0, 0, 'No damage', true, NOW() - INTERVAL '40 days'),
('Mobile Jammer Partial Success', 'medium', 'Swarm of 7 drones at forward base. Mobile jammer deployed, 4 neutralized, 3 escaped at tree line.', 11, 55, 7, 0, 'Perimeter fence damaged by escaped drones: $6,200', true, NOW() - INTERVAL '22 days')
ON CONFLICT DO NOTHING;
