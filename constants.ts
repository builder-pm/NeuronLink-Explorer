import { DataRow, Join, FieldGroups } from './types';

// This map simulates the reference data join from the notebook (norm_prod.countries)
const countryMap: { [key: string]: string } = {
    "PT": "Portugal", "SG": "Singapore", "US": "United States", "BR": "Brazil",
    "AU": "Australia", "KE": "Kenya", "CA": "Canada", "GH": "Ghana",
    "DZ": "Algeria", "AL": "Albania"
};

const sourceMap: { [key:number]: string } = {
    101060: "Nike", 146018: "Theracare INC", 119777: "Arkansas Children's Hospital",
    101342: "Lenovo", 169341: "JobWebKenya", 108891: "InTown Suites",
    102258: "Omni Hotels Corporation", 839: "KBRS", 9: "jobsearchgh",
    876: "Theracare INC", 1: "Nike", 169597: "KBRS", 169596: "Linkedin_GH",
    169595: "ghanacurrentjobs", 169594: "jobsearchgh", 169593: "vacanciesinghana"
};


const BASE_APP_DATA: DataRow[] = [
  { "job_id": 6555256577, "country_code": "PT", "position_month": "Jun-25", "source_id": 101060, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "athena", "advertiser": "Nike", "activity_status": "Current", "seniority": "None" },
  { "job_id": 6555256580, "country_code": "SG", "position_month": "Jun-25", "source_id": 101060, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "athena", "advertiser": "Nike", "activity_status": "Current", "seniority": "None" },
  { "job_id": 6555256682, "country_code": "SG", "position_month": "Jun-25", "source_id": 101060, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "athena", "advertiser": "Nike", "activity_status": "Current", "seniority": "None" },
  { "job_id": 6555272376, "country_code": "US", "position_month": "Jun-25", "source_id": 146018, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "athena", "advertiser": "THERACARE INC", "activity_status": "Current", "seniority": "None" },
  { "job_id": 6555274822, "country_code": "US", "position_month": "Jun-25", "source_id": 119777, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "athena", "advertiser": "Arkansas Children's Hospital", "activity_status": "Current", "seniority": "None" },
  { "job_id": 6555277719, "country_code": "BR", "position_month": "Jun-25", "source_id": 101342, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "athena", "advertiser": "Lenovo", "activity_status": "Current", "seniority": "No level" },
  { "job_id": 6555256698, "country_code": "AU", "position_month": "Jun-25", "source_id": 101060, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "athena", "advertiser": "Nike", "activity_status": "Current", "seniority": "Junior" },
  { "job_id": 6555259868, "country_code": "KE", "position_month": "Jan-25", "source_id": 169341, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "athena", "advertiser": "Grameen Foundation", "activity_status": "Current", "seniority": "Mid-level" },
  { "job_id": 6555260879, "country_code": "US", "position_month": "Jun-25", "source_id": 108891, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "athena", "advertiser": "InTown Suites", "activity_status": "Current", "seniority": "Junior" },
  { "job_id": 6555267888, "country_code": "US", "position_month": "Jun-25", "source_id": 102258, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "athena", "advertiser": "Omni Hotels Corporation", "activity_status": "Current", "seniority": "No level" },
  { "job_id": 1980492385, "country_code": "CA", "position_month": "Aug-25", "source_id": 839, "language": "en", "total_jobs": 1, "total_positions": 1, "data_source": "mysql", "advertiser": null, "activity_status": "Current", "seniority": "Mid-level" },
  { "job_id": 1980492522, "country_code": "CA", "position_month": "Aug-25", "source_id": 839, "language": "es", "total_jobs": 1, "total_positions": 1, "data_source": "mysql", "advertiser": null, "activity_status": "Current", "seniority": "Senior" },
  { "job_id": 1980492302, "country_code": "GH", "position_month": "Aug-25", "source_id": 839, "language": "de", "total_jobs": 1, "total_positions": 1, "data_source": "mysql", "advertiser": null, "activity_status": "Past", "seniority": "None" },
  { "job_id": 1980492022, "country_code": "GH", "position_month": "Aug-25", "source_id": 9, "language": "en", "total_jobs": 5, "total_positions": 5, "data_source": "mysql", "advertiser": "jobsearchgh", "activity_status": "Past", "seniority": "Junior" },
  { "job_id": 1980492396, "country_code": "DZ", "position_month": "Sep-25", "source_id": 839, "language": "it", "total_jobs": 3, "total_positions": 2, "data_source": "mysql", "advertiser": null, "activity_status": "Current", "seniority": "Mid-level" },
  { "job_id": 1980492013, "country_code": "DZ", "position_month": "Sep-25", "source_id": 839, "language": "en", "total_jobs": 2, "total_positions": 2, "data_source": "mysql", "advertiser": null, "activity_status": "Current", "seniority": "Senior" },
  { "job_id": 1980492743, "country_code": "AL", "position_month": "Sep-25", "source_id": 839, "language": "it", "total_jobs": 4, "total_positions": 4, "data_source": "mysql", "advertiser": null, "activity_status": "Past", "seniority": "None" },
  { "job_id": 1980439768, "country_code": "US", "position_month": "Sep-25", "source_id": 876, "language": "en", "total_jobs": 2, "total_positions": 2, "data_source": "mysql", "advertiser": "THERACARE INC", "activity_status": "Current", "seniority": "None" },
  { "job_id": 1980492614, "country_code": "PT", "position_month": "Oct-25", "source_id": 1, "language": "de", "total_jobs": 8, "total_positions": 6, "data_source": "mysql", "advertiser": "Nike", "activity_status": "Current", "seniority": "Junior" },
  { "job_id": 1980439807, "country_code": "PT", "position_month": "Oct-25", "source_id": 876, "language": "en", "total_jobs": 3, "total_positions": 3, "data_source": "mysql", "advertiser": "Nike", "activity_status": "Current", "seniority": "None" },
  { "job_id": 6571333276, "country_code": "AU", "position_month": "Oct-25", "source_id": 169597, "language": "es", "total_jobs": 2, "total_positions": 2, "data_source": "mysql", "advertiser": "KBRS", "activity_status": "Current", "seniority": "None" },
  { "job_id": 6571333275, "country_code": "AU", "position_month": "Nov-25", "source_id": 169596, "language": "es", "total_jobs": 1, "total_positions": 1, "data_source": "mysql", "advertiser": "Linkedin_GH", "activity_status": "Past", "seniority": "Senior" },
  { "job_id": 6571333274, "country_code": "BR", "position_month": "Nov-25", "source_id": 169595, "language": "en", "total_jobs": 5, "total_positions": 4, "data_source": "mysql", "advertiser": "ghanacurrentjobs", "activity_status": "Current", "seniority": "Mid-level" },
  { "job_id": 6571333273, "country_code": "KE", "position_month": "Nov-25", "source_id": 169594, "language": "de", "total_jobs": 3, "total_positions": 3, "data_source": "mysql", "advertiser": "jobsearchgh", "activity_status": "Current", "seniority": "Junior" },
  { "job_id": 6571333272, "country_code": "CA", "position_month": "Dec-25", "source_id": 169593, "language": "en", "total_jobs": 2, "total_positions": 1, "data_source": "mysql", "advertiser": "vacanciesinghana", "activity_status": "Past", "seniority": "None" }
];

// Data for the 'jobs' table
export const JOBS_DATA: DataRow[] = BASE_APP_DATA;

// Data for the 'countries' table, extracted from the map
export const COUNTRIES_DATA: DataRow[] = Object.entries(countryMap).map(([code, name]) => ({
  country_code: code,
  country_name: name
}));

// Data for the 'sources' table, extracted from the map
export const SOURCES_DATA: DataRow[] = Object.entries(sourceMap).map(([id, name]) => ({
  source_id: parseInt(id),
  source_name: name
}));


// Default groups for fields. This can be customized by the user.
export const INITIAL_FIELD_GROUPS: FieldGroups = {
    "Location": ["country_code", "country_name"],
    "Date": ["position_month"],
    "Source": ["source_id", "source_name", "data_source"],
    "Job Attributes": ["job_id", "language", "total_jobs", "total_positions", "advertiser", "activity_status", "seniority"],
    "Uncategorized": [],
};


export const initialSql = `SELECT * FROM jobs`;


export const JOINS: Join[] = [
    { from: "jobs", to: "countries", type: 'LEFT JOIN', on: { from: 'country_code', to: 'country_code' } },
    { from: "jobs", to: "sources", type: 'LEFT JOIN', on: { from: 'source_id', to: 'source_id' } },
];