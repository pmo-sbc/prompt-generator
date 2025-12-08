/**
 * Prompt Generator for Company/Community Descriptions
 * Generates marketing/business descriptions based on company and community data
 */

/**
 * Generate a company/community service description prompt
 * @param {Object} company - Company data with name, legal_name, marketing_name
 * @param {Array} communities - Array of community objects with name, ilec, clec, technologies
 * @returns {string} Generated prompt/description
 */
function generateCompanyPrompt(company, communities) {
    if (!company || !communities || communities.length === 0) {
        return 'Insufficient data to generate description.';
    }

    // Use marketing name if available, otherwise legal name, otherwise name
    const companyDisplayName = company.marketing_name || company.legal_name || company.name;
    const isCooperative = company.name.toLowerCase().includes('cooperative') || 
                          (company.marketing_name && company.marketing_name.toLowerCase().includes('cooperative')) ||
                          (company.legal_name && company.legal_name.toLowerCase().includes('cooperative'));

    let prompt = 'We are a Communications Service Provider (CSP)';

    // Add company type description
    if (isCooperative) {
        prompt += `. We are a Telecommunications Cooperative owned by our members.`;
    } else {
        prompt += `.`;
    }

    // Collect all unique technologies across all communities
    const technologiesMap = {
        'Fiber': { speeds: [], locations: [], details: [], hasTechnology: false },
        'Copper': { speeds: [], locations: [], details: [], hasTechnology: false },
        'Fixed Wireless': { speeds: [], locations: [], details: [], licenseTypes: new Set(), hasTechnology: false }
    };

    const locations = [];
    const serviceAreas = { ilec: [], clec: [] };

    // Process each community
    communities.forEach(community => {
        if (community.ilec) serviceAreas.ilec.push(community.name);
        if (community.clec) serviceAreas.clec.push(community.name);
        locations.push(community.name);

        // Process technologies for this community
        // Handle technologies as string (JSON) or already parsed array
        let technologies = community.technologies;
        if (technologies && typeof technologies === 'string') {
            try {
                technologies = JSON.parse(technologies);
            } catch (e) {
                console.error('Error parsing technologies JSON:', e);
                technologies = [];
            }
        }

        if (technologies && Array.isArray(technologies) && technologies.length > 0) {
            technologies.forEach(tech => {
                const techType = tech.type;
                if (!techType || !technologiesMap[techType]) return;

                // Mark that this technology exists
                technologiesMap[techType].hasTechnology = true;
                
                // Debug logging
                console.log(`Processing ${techType} for community ${community.name}:`, {
                    packagesCount: tech.packages ? tech.packages.length : 0,
                    packages: tech.packages
                });

                // Process packages for this technology
                if (tech.packages && Array.isArray(tech.packages)) {
                    tech.packages.forEach(pkg => {
                        // Handle different speed field names (downloadSpeed/uploadSpeed vs download_speed/upload_speed)
                        const downloadSpeed = (pkg.downloadSpeed || pkg.download_speed || '').toString().trim();
                        const uploadSpeed = (pkg.uploadSpeed || pkg.upload_speed || '').toString().trim();
                        
                        // Add units if they're missing (assume Mbps if just a number)
                        let formattedDownload = downloadSpeed;
                        let formattedUpload = uploadSpeed;
                        
                        if (downloadSpeed && !downloadSpeed.match(/\s?(Mbps|Gbps|Kbps|mbps|gbps|kbps)/i)) {
                            formattedDownload = downloadSpeed + ' Mbps';
                        }
                        if (uploadSpeed && !uploadSpeed.match(/\s?(Mbps|Gbps|Kbps|mbps|gbps|kbps)/i)) {
                            formattedUpload = uploadSpeed + ' Mbps';
                        }
                        
                        if (downloadSpeed || uploadSpeed) {
                            // Extract just the numeric value with units (e.g., "500 Mbps" or "500Mbps")
                            const downloadNum = extractSpeedValue(formattedDownload);
                            const uploadNum = extractSpeedValue(formattedUpload);
                            
                            // Store speed representation
                            // Always use combined format (download / upload) when both are available
                            // Otherwise, use just the available speed
                            if (downloadNum && uploadNum) {
                                // Both speeds available - always use combined format
                                const combinedSpeed = `${formattedDownload} / ${formattedUpload}`;
                                if (!technologiesMap[techType].speeds.includes(combinedSpeed)) {
                                    technologiesMap[techType].speeds.push(combinedSpeed);
                                }
                            } else if (downloadNum) {
                                // Only download speed
                                if (!technologiesMap[techType].speeds.includes(formattedDownload)) {
                                    technologiesMap[techType].speeds.push(formattedDownload);
                                }
                            } else if (uploadNum) {
                                // Only upload speed
                                if (!technologiesMap[techType].speeds.includes(formattedUpload)) {
                                    technologiesMap[techType].speeds.push(formattedUpload);
                                }
                            }
                        }

                        // For Fixed Wireless, collect license types
                        if (techType === 'Fixed Wireless') {
                            if (pkg.licenseType) {
                                technologiesMap[techType].licenseTypes.add(pkg.licenseType);
                            } else if (pkg.license_type) {
                                technologiesMap[techType].licenseTypes.add(pkg.license_type);
                            } else if (pkg.licensed !== undefined) {
                                // Handle boolean licenseType
                                technologiesMap[techType].licenseTypes.add(pkg.licensed ? 'Licensed' : 'Unlicensed');
                            }
                        }
                    });
                }
            });
        }
    });

    // Build service descriptions
    const services = [];

    // Fiber services
    if (technologiesMap['Fiber'].hasTechnology) {
        const speeds = technologiesMap['Fiber'].speeds;
        let fiberDesc = `We Provide Fiber Optic services that deliver telephony services and Internet access`;
        
        if (speeds.length > 0) {
            // Sort speeds numerically and get unique values
            // Handle combined speeds (download / upload) by extracting the download value
            const sortedSpeeds = speeds.sort((a, b) => {
                // For combined speeds like "100 Mbps / 50 Mbps", extract the first number
                const aVal = extractSpeedValue(a) || 0;
                const bVal = extractSpeedValue(b) || 0;
                return aVal - bVal;
            });
            const uniqueSpeeds = [...new Set(sortedSpeeds)];
            const maxSpeed = uniqueSpeeds.length > 0 ? uniqueSpeeds[uniqueSpeeds.length - 1] : null;
            
            if (maxSpeed) {
                // Use the full speed format (download / upload) if available, otherwise just download
                if (maxSpeed.includes(' / ')) {
                    fiberDesc += ` at speeds to residential and businesses upward of ${maxSpeed}`;
                } else {
                    fiberDesc += ` at speeds to residential and businesses upward of ${maxSpeed}`;
                }
            }
            
            // Include other speed tiers if available
            if (uniqueSpeeds.length > 1) {
                const otherSpeeds = uniqueSpeeds.slice(0, -1);
                fiberDesc += `, we also offer tiered speed services of ${otherSpeeds.join(', ')}`;
            }
        }
        
        services.push(fiberDesc);
    }

    // Fixed Wireless services
    if (technologiesMap['Fixed Wireless'].hasTechnology) {
        const speeds = technologiesMap['Fixed Wireless'].speeds;
        let fwDesc = `We offer Fixed Wireless Access that replaces the high cost of fiber with wireless services`;
        
        if (speeds.length > 0) {
            // Sort speeds numerically
            const sortedSpeeds = speeds.sort((a, b) => {
                const aVal = extractSpeedValue(a) || 0;
                const bVal = extractSpeedValue(b) || 0;
                return aVal - bVal;
            });
            const uniqueSpeeds = [...new Set(sortedSpeeds)];
            const maxSpeed = uniqueSpeeds.length > 0 ? uniqueSpeeds[uniqueSpeeds.length - 1] : null;
            
            if (maxSpeed) {
                fwDesc += ` that provide up to ${maxSpeed}`;
            }
        }
        
        // Add service areas
        const areas = [];
        if (serviceAreas.ilec.length > 0) {
            areas.push(`in some of the most remote areas of our ILEC territory`);
        }
        if (serviceAreas.clec.length > 0) {
            if (areas.length > 0) {
                areas.push(`and surrounding CLEC service areas`);
            } else {
                areas.push(`in CLEC service areas`);
            }
        }
        
        if (areas.length > 0) {
            fwDesc += ` ${areas.join(' ')}`;
        }
        
        services.push(fwDesc);
    }

    // Copper services (if present)
    if (technologiesMap['Copper'].hasTechnology) {
        const speeds = technologiesMap['Copper'].speeds;
        let copperDesc = `We provide Copper-based services`;
        
        if (speeds.length > 0) {
            // Sort speeds numerically
            const sortedSpeeds = speeds.sort((a, b) => {
                // For combined speeds, extract the first number (download)
                const aVal = extractSpeedValue(a) || 0;
                const bVal = extractSpeedValue(b) || 0;
                return aVal - bVal;
            });
            const uniqueSpeeds = [...new Set(sortedSpeeds)];
            const maxSpeed = uniqueSpeeds.length > 0 ? uniqueSpeeds[uniqueSpeeds.length - 1] : null;
            
            if (maxSpeed) {
                // Use full speed format (download / upload) if available
                copperDesc += ` delivering speeds up to ${maxSpeed}`;
            }
        }
        
        services.push(copperDesc);
    }

    // Add managed WiFi if mentioned (can be inferred or added manually)
    // For now, we'll add it as a standard service

    // Combine service descriptions
    if (services.length > 0) {
        prompt += ' ' + services.join('. ') + '.';
    } else {
        // If no specific technology services, add generic description
        prompt += ' We offer telecommunications services';
        
        // Add ILEC/CLEC information if available
        const hasIlec = serviceAreas.ilec.length > 0;
        const hasClec = serviceAreas.clec.length > 0;
        if (hasIlec || hasClec) {
            const serviceTypes = [];
            if (hasIlec) {
                serviceTypes.push('in our ILEC territory');
            }
            if (hasClec) {
                serviceTypes.push('in CLEC service areas');
            }
            if (serviceTypes.length > 0) {
                prompt += ` ${serviceTypes.join(' and ')}`;
            }
        }
        prompt += '.';
    }

    // Add additional services (managed WiFi)
    prompt += ' We also provide managed WiFi services for residential and businesses. Customer are not required to buy the home routers, they are able to pay a monthly lease and conserve their capital.';

    // Add service locations
    if (locations.length > 0) {
        const uniqueLocations = [...new Set(locations)];
        prompt += `\n\nWe offer services in: ${uniqueLocations.join(', ')}`;
    }

    return prompt;
}

/**
 * Extract numeric value from speed string
 * @param {string} speed - Speed string (e.g., "500 Mbps", "500Mbps")
 * @returns {number|null} Numeric value or null
 */
function extractSpeedValue(speed) {
    if (!speed) return null;
    const match = speed.toString().match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
}

/**
 * Format speed string from download and upload speeds
 * @param {string} download - Download speed (e.g., "100 Mbps")
 * @param {string} upload - Upload speed (e.g., "20 Mbps")
 * @returns {string} Formatted speed string
 */
function formatSpeed(download, upload) {
    if (!download && !upload) return null;
    if (download && upload) {
        return `${download} / ${upload}`;
    }
    return download || upload;
}

/**
 * Find the maximum speed from an array of speed strings
 * Extracts numeric values and returns the highest speed string
 * @param {Array<string>} speeds - Array of speed strings
 * @returns {string} Maximum speed string
 */
function findMaxSpeed(speeds) {
    if (!speeds || speeds.length === 0) return null;
    
    let maxNum = 0;
    let maxSpeed = speeds[0];
    
    speeds.forEach(speed => {
        // Extract numeric value (handle formats like "500Mbps", "500 Mbps", "500/100 Mbps")
        const match = speed.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxNum) {
                maxNum = num;
                maxSpeed = speed;
            }
        }
    });
    
    return maxSpeed;
}

module.exports = {
    generateCompanyPrompt
};

