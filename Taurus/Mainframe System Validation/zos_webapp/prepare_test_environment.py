from pprint import pprint
from pybright.cli import bright


def start_not_running_tasks(prefix):
    expected_jobnames = {
        "SYS1": ['JOB1A', 'JOB1B'],
        "SYS2": ['JOB2A', 'JOB2B']
    }
    owner = "APPSERV"

    active_jobs = []
    for job in bright(f"zos-jobs list jobs --prefix {prefix}* --owner {owner}"):
        if job['status'] == 'ACTIVE':
            active_jobs.append(job['jobname'])

    print("Active jobs:")
    print(", ".join(active_jobs))

    for system, jobnames in expected_jobnames.items():
        for jobname in jobnames:
            if jobname not in active_jobs:
                print(
                    f"Job {jobname} is not active on system {system}. Starting...")
                bright(
                    f'zos-console issue command --sysplex-system {system} "S {jobname}"')


if __name__ == '__main__':
    start_not_running_tasks()
